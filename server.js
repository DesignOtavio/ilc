const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

dotenv.config();

const app = express();
app.use(express.json());

// Sessão para suportar o fluxo OAuth do Google
app.use(session({
  secret: process.env.SESSION_SECRET || 'ilc-session-secret-fallback',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 10 * 60 * 1000 } // 10min para o flow OAuth
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport serialization (mínimo — só usamos sessão durante o flow OAuth)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'dist')));


// Configurações do Banco de Dados
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ ERRO CRÍTICO: Variável de ambiente DATABASE_URL não configurada no .env!');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-patria-orgulho-ilc';

// ==========================================
// CONFIGURAÇÃO GOOGLE OAUTH (PASSPORT)
// ==========================================

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    // Apenas passamos o perfil do Google para o callback handler
    return done(null, {
      google_id: profile.id,
      email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
      name: profile.displayName
    });
  }));

  // Iniciar fluxo OAuth — redireciona para o Google
  app.get('/api/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));

  // Callback do Google após autenticação
  app.get('/api/auth/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/?google_error=1' }),
    async (req, res) => {
      const { google_id, email } = req.user;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Verificar se já existe conta com esse google_id
        let userRes = await client.query(
          `SELECT u.id, u.username, r.name as role
           FROM users u
           JOIN user_roles ur ON u.id = ur.user_id
           JOIN roles r ON ur.role_id = r.id
           WHERE u.google_id = $1`,
          [google_id]
        );

        if (userRes.rows.length > 0) {
          // Conta existente — login direto
          const user = userRes.rows[0];
          const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
          await client.query('COMMIT');
          // Redirecionar com token na URL (frontend captura e armazena)
          return res.redirect(`/?google_token=${token}&google_role=${user.role}&google_username=${encodeURIComponent(user.username)}`);
        }

        // Verificar se e-mail já existe em outra conta
        if (email) {
          const emailCheck = await client.query('SELECT id FROM users WHERE email = $1 AND google_id IS NULL', [email]);
          if (emailCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.redirect('/?google_error=email_exists');
          }
        }

        // Nova conta — redirecionar para completar cadastro com nickname
        await client.query('COMMIT');
        const tempToken = jwt.sign({ google_id, email, needs_nickname: true }, JWT_SECRET, { expiresIn: '15m' });
        return res.redirect(`/?google_new=1&google_temp=${tempToken}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro no callback Google OAuth:', err.message);
        return res.redirect('/?google_error=server');
      } finally {
        client.release();
      }
    }
  );
} else {
  console.warn('⚠️  GOOGLE_CLIENT_ID/SECRET não configurados. Login com Google desabilitado.');
}


pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erro de conexão com o banco de dados:', err.message);
    return;
  }
  console.log('🏛️ Conectado com sucesso ao Supabase/PostgreSQL.');
  release();
  ensureSchemaMigrations().then(initializeDatabase).catch((migrationErr) => {
    console.error('❌ Falha ao aplicar migrações de schema:', migrationErr.message);
  });
});

async function ensureSchemaMigrations() {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE');
  await pool.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL');
}

// Inicialização e Carga Base de Usuários (Se necessário)
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Verificar se já temos usuários no banco
    const res = await client.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(res.rows[0].count, 10);

    if (userCount === 0) {
      console.log('🌱 Banco de dados limpo detectado. Iniciando semente de usuários administrativos e cidadãos...');
      await client.query('BEGIN');

      const adminRoleId = (await client.query("SELECT id FROM roles WHERE name = 'admin'")).rows[0].id;
      const operatorRoleId = (await client.query("SELECT id FROM roles WHERE name = 'operator'")).rows[0].id;
      const auditorRoleId = (await client.query("SELECT id FROM roles WHERE name = 'auditor'")).rows[0].id;
      const citizenRoleId = (await client.query("SELECT id FROM roles WHERE name = 'citizen'")).rows[0].id;

      // Senhas criptografadas
      const adminPass = await bcrypt.hash('admin123', 10);
      const operatorPass = await bcrypt.hash('operator123', 10);
      const auditorPass = await bcrypt.hash('auditor123', 10);
      const citizenPass = await bcrypt.hash('cidadao123', 10);

      // 1. Cadastrar Administrador
      const adminRes = await client.query(
        `INSERT INTO users (username, email, celular, password_hash)
         VALUES ('comissario_otavio', 'admin@ilc.gov', '+5511999999999', $1) RETURNING id`,
        [adminPass]
      );
      const adminId = adminRes.rows[0].id;
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [adminId, adminRoleId]);
      await client.query('INSERT INTO score_accounts (user_id, current_score) VALUES ($1, 9500)', [adminId]);

      // 2. Cadastrar Operador
      const operatorRes = await client.query(
        `INSERT INTO users (username, email, celular, password_hash)
         VALUES ('operador_civil', 'operator@ilc.gov', '+5511888888888', $1) RETURNING id`,
        [operatorPass]
      );
      const operatorId = operatorRes.rows[0].id;
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [operatorId, operatorRoleId]);
      await client.query('INSERT INTO score_accounts (user_id, current_score) VALUES ($1, 7500)', [operatorId]);

      // 3. Cadastrar Auditor
      const auditorRes = await client.query(
        `INSERT INTO users (username, email, celular, password_hash)
         VALUES ('auditor_pátria', 'auditor@ilc.gov', '+5511777777777', $1) RETURNING id`,
        [auditorPass]
      );
      const auditorId = auditorRes.rows[0].id;
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [auditorId, auditorRoleId]);
      await client.query('INSERT INTO score_accounts (user_id, current_score) VALUES ($1, 6200)', [auditorId]);

      // 4. Cadastrar Cidadãos de Demonstração
      const citizens = [
        { name: 'joao_silva', email: 'joao.silva@cidadania.br', phone: '+5511911112222', score: 5000 },
        { name: 'elena_rostova', email: 'elena.rostova@cidadania.br', phone: '+5511922223333', score: 8200 },
        { name: 'carlos_antunes', email: 'carlos.antunes@cidadania.br', phone: '+5511933334444', score: 1200 },
        { name: 'mariana_souza', email: 'mariana.souza@cidadania.br', phone: '+5511944445555', score: 9600 },
        { name: 'ricardo_lima', email: 'ricardo.lima@cidadania.br', phone: '+5511955556666', score: 3400 }
      ];

      for (const cit of citizens) {
        const uRes = await client.query(
          `INSERT INTO users (username, email, celular, password_hash)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [cit.name, cit.email, cit.phone, citizenPass]
        );
        const uId = uRes.rows[0].id;
        await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [uId, citizenRoleId]);
        await client.query('INSERT INTO score_accounts (user_id, current_score) VALUES ($1, $2)', [uId, cit.score]);

        // Adicionar um evento histórico inicial para justificar a pontuação
        const eventTypeRes = await client.query(
          "SELECT id, points_delta FROM score_event_types WHERE code = 'servico_militar'"
        );
        if (eventTypeRes.rows.length > 0 && cit.score !== 5000) {
          const type = eventTypeRes.rows[0];
          await client.query(
            `INSERT INTO score_events (user_id, event_type_id, points_delta, description, status, approved_by)
             VALUES ($1, $2, $3, 'Adesão de histórico militar cívico', 'approved', $4)`,
            [uId, type.id, cit.score - 5000, adminId]
          );

          // Verificar certificados para pontos iniciais
          if (cit.score - 5000 > 0) {
            const certs = await client.query("SELECT id FROM merit_certificates WHERE points_required <= $1", [cit.score - 5000]);
            for (const cert of certs.rows) {
              await client.query(
                "INSERT INTO user_certificates (user_id, certificate_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [uId, cert.id]
              );
            }
          }
        }
      }

      await client.query('COMMIT');
      console.log('✅ Carga base de demonstração inserida com sucesso.');
    }
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Falha ao inicializar dados base:', e.message);
  } finally {
    client.release();
  }
}

// MIDDLEWARES DE AUTENTICAÇÃO E AUTORIZAÇÃO

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
    req.user = decoded;
    next();
  });
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Você não tem permissão cívica para acessar este recurso.' });
    }
    next();
  };
}

// FUNÇÃO HELPER: Lógica transacional de recálculo de Score e outorga de Certificados

async function applyScoreChange(client, userId, pointsDelta, actorId) {
  // Obter pontuação atual com bloqueio de linha
  const accountRes = await client.query(
    'SELECT current_score FROM score_accounts WHERE user_id = $1 FOR UPDATE',
    [userId]
  );
  if (accountRes.rows.length === 0) {
    throw new Error('Conta cívica de pontuação não encontrada.');
  }

  const oldScore = accountRes.rows[0].current_score;
  // Limites rígidos de 0 a 10000
  const newScore = Math.max(0, Math.min(10000, oldScore + pointsDelta));

  // Atualizar tabela
  await client.query(
    'UPDATE score_accounts SET current_score = $1, updated_at = NOW() WHERE user_id = $2',
    [newScore, userId]
  );

  // Registrar no Log de Auditoria
  await client.query(
    `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, old_data, new_data)
     VALUES ($1, 'score_accounts', (SELECT id FROM score_accounts WHERE user_id = $2), 'update_score', $3, $4)`,
    [
      actorId,
      userId,
      JSON.stringify({ score: oldScore }),
      JSON.stringify({ score: newScore, delta: pointsDelta })
    ]
  );

  // Calcular o total acumulado de pontos de mérito (apenas recompensas aprovadas)
  const meritsRes = await client.query(
    `SELECT COALESCE(SUM(points_delta), 0) as total_merits 
     FROM score_events 
     WHERE user_id = $1 AND status = 'approved' AND points_delta > 0`,
    [userId]
  );
  const totalMerits = parseInt(meritsRes.rows[0].total_merits, 10);

  // Verificar e desbloquear novos certificados
  const certsToUnlockRes = await client.query(
    `SELECT mc.id, mc.name 
     FROM merit_certificates mc
     WHERE mc.points_required <= $1 
       AND mc.id NOT IN (SELECT certificate_id FROM user_certificates WHERE user_id = $2)`,
    [totalMerits, userId]
  );

  const unlockedCerts = [];
  for (const cert of certsToUnlockRes.rows) {
    await client.query(
      'INSERT INTO user_certificates (user_id, certificate_id, granted_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
      [userId, cert.id]
    );
    unlockedCerts.push(cert.name);

    // Auditoria do certificado outorgado
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, new_data)
       VALUES ($1, 'user_certificates', $2, 'grant_certificate', $3)`,
      [
        actorId,
        userId,
        JSON.stringify({ certificate_name: cert.name })
      ]
    );
  }

  return { oldScore, newScore, unlockedCerts };
}


// ==========================================
// ROTAS DE AUTENTICAÇÃO (API)
// ==========================================

// Registrar cidadão comum
app.post('/api/auth/register', async (req, res) => {
  const { username, email, celular, password } = req.body;

  if (!username) return res.status(400).json({ error: 'O nickname é obrigatório.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validar nickname único
    const checkUsername = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    if (checkUsername.rows.length > 0) {
      return res.status(400).json({ error: 'Este nickname já está sendo usado por outro cidadão.' });
    }

    if (email) {
      const checkEmail = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (checkEmail.rows.length > 0) {
        return res.status(400).json({ error: 'Este e-mail já está sendo usado.' });
      }
    }

    if (celular) {
      const checkCel = await client.query('SELECT id FROM users WHERE celular = $1', [celular]);
      if (checkCel.rows.length > 0) {
        return res.status(400).json({ error: 'Este telefone celular já está registrado.' });
      }
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    // Criar Usuário
    const userInsert = await client.query(
      `INSERT INTO users (username, email, celular, password_hash, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
      [username, email || null, celular || null, passwordHash]
    );
    const userId = userInsert.rows[0].id;

    // Associar papel citizen
    const roleRes = await client.query("SELECT id FROM roles WHERE name = 'citizen'");
    const citizenRoleId = roleRes.rows[0].id;
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, citizenRoleId]);

    // Inicializar conta de pontos (5.000 pontos padrão)
    await client.query('INSERT INTO score_accounts (user_id, started_score, current_score) VALUES ($1, 5000, 5000)', [userId]);

    // Auditoria
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, new_data)
       VALUES ($1, 'users', $2, 'citizen_self_register', $3)`,
      [userId, userId, JSON.stringify({ username, email, celular })]
    );

    await client.query('COMMIT');

    // Gerar Token
    const token = jwt.sign({ id: userId, username, email, role: 'citizen' }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, role: 'citizen', username });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Falha ao registrar cidadão: ' + err.message });
  } finally {
    client.release();
  }
});

// Completar Cadastro via Google (aceita temp_token do callback OAuth ou dados diretos)
app.post('/api/auth/google-signup', async (req, res) => {
  let google_id, email;
  const { temp_token, username } = req.body;

  // Fluxo real OAuth: verifica o token temporário gerado no callback
  if (temp_token) {
    try {
      const decoded = jwt.verify(temp_token, JWT_SECRET);
      if (!decoded.needs_nickname) {
        return res.status(400).json({ error: 'Token temporário inválido.' });
      }
      google_id = decoded.google_id;
      email = decoded.email;
    } catch (err) {
      return res.status(401).json({ error: 'Token temporário expirado ou inválido. Inicie o processo novamente.' });
    }
  } else {
    // Fluxo legado (não-OAuth): aceita google_id/email direto
    google_id = req.body.google_id;
    email = req.body.email;
  }

  if (!google_id) {
    return res.status(400).json({ error: 'Dados do Google insuficientes.' });
  }

  if (!username) {
    return res.status(400).json({ error: 'Nickname único obrigatório para concluir o cadastro cívico.', needs_nickname: true });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar se já existe por google_id (login direto)
    let userRes = await client.query(
      `SELECT u.id, u.username, r.name as role
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE u.google_id = $1`,
      [google_id]
    );

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
      await client.query('COMMIT');
      return res.json({ token, role: user.role, username: user.username });
    }

    // Verificar nickname único
    const checkNickname = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    if (checkNickname.rows.length > 0) {
      return res.status(400).json({ error: 'Nickname indisponível. Escolha outro.' });
    }

    if (email) {
      const checkEmail = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (checkEmail.rows.length > 0) {
        return res.status(400).json({ error: 'Este e-mail do Google já está associado a outra conta.' });
      }
    }

    // Inserir usuário
    const uInsert = await client.query(
      `INSERT INTO users (username, email, google_id, status)
       VALUES ($1, $2, $3, 'active') RETURNING id`,
      [username, email || null, google_id]
    );
    const userId = uInsert.rows[0].id;

    // Associar papel citizen
    const roleRes = await client.query("SELECT id FROM roles WHERE name = 'citizen'");
    const citizenRoleId = roleRes.rows[0].id;
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, citizenRoleId]);

    // Criar score account (5000)
    await client.query('INSERT INTO score_accounts (user_id, current_score) VALUES ($1, 5000)', [userId]);

    // Audit
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, new_data)
       VALUES ($1, 'users', $2, 'google_signup', $3)`,
      [userId, userId, JSON.stringify({ username, email, google_id })]
    );

    await client.query('COMMIT');

    const token = jwt.sign({ id: userId, username, role: 'citizen' }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, role: 'citizen', username });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Falha ao cadastrar via Google: ' + err.message });
  } finally {
    client.release();
  }
});


// Login Unificado (Nickname, E-mail ou Celular)
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identificador cívico e senha são obrigatórios.' });
  }

  try {
    const userRes = await pool.query(
      `SELECT u.*, r.name as role_name
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE u.email = $1 OR u.celular = $1 OR u.username = $1`,
      [identifier]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais cívicas inválidas ou inexistentes.' });
    }

    const user = userRes.rows[0];

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Seu privilégio de acesso foi SUSPENSO pelo Estado cívico.' });
    }

    if (!user.password_hash) {
      return res.status(400).json({ error: 'Esta conta requer login social (Google).' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciais cívicas inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role_name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, role: user.role_name, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor durante login: ' + err.message });
  }
});


// ==========================================
// ROTAS DO CIDADÃO (API)
// ==========================================

// Obter dados do cidadão autenticado
app.get('/api/citizen/me', authenticateToken, requireRole(['citizen', 'admin', 'operator', 'auditor']), async (req, res) => {
  try {
    const citizenId = req.user.id;

    // Obter dados básicos e pontuação
    const citizenRes = await pool.query(
      `SELECT u.id, u.username, u.email, u.celular, u.status, sa.current_score
       FROM users u
       JOIN score_accounts sa ON u.id = sa.user_id
       WHERE u.id = $1`,
      [citizenId]
    );

    if (citizenRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cidadão não encontrado.' });
    }

    const citizen = citizenRes.rows[0];

    // Obter faixa com base na pontuação atual
    const score = citizen.current_score;
    const tierRes = await pool.query(
      `SELECT * FROM score_tiers WHERE min_score <= $1 AND max_score >= $2`,
      [score, score]
    );
    const tier = tierRes.rows[0] || null;

    // Obter a próxima faixa disponível (para barra de progresso)
    const nextTierRes = await pool.query(
      `SELECT * FROM score_tiers WHERE min_score > $1 ORDER BY min_score ASC LIMIT 1`,
      [score]
    );
    const nextTier = nextTierRes.rows[0] || null;

    // Obter certificados
    const certsRes = await pool.query(
      `SELECT mc.*, uc.granted_at 
       FROM user_certificates uc
       JOIN merit_certificates mc ON uc.certificate_id = mc.id
       WHERE uc.user_id = $1`,
      [citizenId]
    );

    // Obter histórico de eventos
    const eventsRes = await pool.query(
      `SELECT se.id, se.points_delta, se.description, se.status, se.occurred_at, sety.name as type_name, sety.category
       FROM score_events se
       JOIN score_event_types sety ON se.event_type_id = sety.id
       WHERE se.user_id = $1
       ORDER BY se.occurred_at DESC`,
      [citizenId]
    );

    res.json({
      profile: citizen,
      tier,
      next_tier: nextTier,
      certificates: certsRes.rows,
      history: eventsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados do cidadão: ' + err.message });
  }
});

// Alterar nickname
app.put('/api/citizen/update-nickname', authenticateToken, async (req, res) => {
  const { nickname } = req.body;
  if (!nickname || nickname.trim() === '') {
    return res.status(400).json({ error: 'O novo nickname não pode ser vazio.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar se já existe
    const dupRes = await client.query('SELECT id FROM users WHERE username = $1 AND id <> $2', [nickname, req.user.id]);
    if (dupRes.rows.length > 0) {
      return res.status(400).json({ error: 'Este nickname já está em uso por outro cidadão.' });
    }

    // Obter nickname anterior
    const oldRes = await client.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const oldNickname = oldRes.rows[0].username;

    // Atualizar
    await client.query('UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2', [nickname, req.user.id]);

    // Registrar auditoria
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, old_data, new_data)
       VALUES ($1, 'users', $2, 'update_nickname', $3, $4)`,
      [
        req.user.id,
        req.user.id,
        JSON.stringify({ nickname: oldNickname }),
        JSON.stringify({ nickname })
      ]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Nickname cívico atualizado com sucesso.', nickname });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao atualizar nickname: ' + err.message });
  } finally {
    client.release();
  }
});


// ==========================================
// ROTAS DE ADMINISTRAÇÃO (API COM RBAC)
// ==========================================

// Métricas Gerais do Dashboard do Admin
app.get('/api/admin/metrics', authenticateToken, requireRole(['admin', 'operator', 'auditor']), async (req, res) => {
  try {
    // Total de cidadãos
    const citizenRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'citizen'");
    const citizenRoleId = citizenRoleRes.rows[0].id;

    const countRes = await pool.query(
      'SELECT COUNT(*) FROM user_roles WHERE role_id = $1',
      [citizenRoleId]
    );
    const totalCitizens = parseInt(countRes.rows[0].count, 10);

    // Média de pontuação
    const avgRes = await pool.query(
      `SELECT AVG(sa.current_score) as avg_score 
       FROM score_accounts sa
       JOIN user_roles ur ON sa.user_id = ur.user_id
       WHERE ur.role_id = $1`,
      [citizenRoleId]
    );
    const averageScore = parseFloat(avgRes.rows[0].avg_score || 0).toFixed(1);

    // Distribuição por Faixa
    const distRes = await pool.query(`
      SELECT 
        t.name as tier_name, 
        t.color,
        COUNT(sa.id) as count
      FROM score_tiers t
      LEFT JOIN score_accounts sa ON sa.current_score BETWEEN t.min_score AND t.max_score
      LEFT JOIN user_roles ur ON sa.user_id = ur.user_id AND ur.role_id = $1
      GROUP BY t.id, t.name, t.color, t.min_score
      ORDER BY t.min_score ASC
    `, [citizenRoleId]);

    // Últimos eventos pendentes
    const pendingEventsRes = await pool.query(`
      SELECT se.id, se.points_delta, se.description, se.created_at, u.username as citizen_name, sety.name as type_name
      FROM score_events se
      JOIN users u ON se.user_id = u.id
      JOIN score_event_types sety ON se.event_type_id = sety.id
      WHERE se.status = 'pending'
      ORDER BY se.created_at DESC
      LIMIT 10
    `);

    // Quantidade de alertas (ex: pessoas na faixa de vigilância máxima)
    const alertRes = await pool.query(`
      SELECT COUNT(*) FROM score_accounts sa
      JOIN user_roles ur ON sa.user_id = ur.user_id
      WHERE ur.role_id = $1 AND sa.current_score < 2000
    `, [citizenRoleId]);

    res.json({
      total_citizens: totalCitizens,
      average_score: parseFloat(averageScore),
      distribution: distRes.rows,
      pending_events: pendingEventsRes.rows,
      alert_count: parseInt(alertRes.rows[0].count, 10)
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao coletar métricas do dashboard: ' + err.message });
  }
});

// Listagem de Cidadãos com filtros
app.get('/api/admin/citizens', authenticateToken, requireRole(['admin', 'operator', 'auditor']), async (req, res) => {
  const { search, status, tier, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const citizenRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'citizen'");
    const citizenRoleId = citizenRoleRes.rows[0].id;

    let query = `
      SELECT u.id, u.username, u.email, u.celular, u.status, sa.current_score, sa.updated_at,
             (SELECT COUNT(*) FROM score_events WHERE user_id = u.id AND points_delta > 0 AND status = 'approved') as rewards_count,
             (SELECT COUNT(*) FROM score_events WHERE user_id = u.id AND points_delta < 0 AND status = 'approved') as penalties_count
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN score_accounts sa ON u.id = sa.user_id
      WHERE ur.role_id = $1
    `;

    const params = [citizenRoleId];
    let paramCounter = 2;

    if (search) {
      query += ` AND (u.username ILIKE $${paramCounter} OR u.email ILIKE $${paramCounter} OR u.celular ILIKE $${paramCounter})`;
      params.push(`%${search}%`);
      paramCounter++;
    }

    if (status) {
      query += ` AND u.status = $${paramCounter}`;
      params.push(status);
      paramCounter++;
    }

    if (tier) {
      const tierRes = await pool.query('SELECT min_score, max_score FROM score_tiers WHERE name = $1', [tier]);
      if (tierRes.rows.length > 0) {
        const { min_score, max_score } = tierRes.rows[0];
        query += ` AND sa.current_score BETWEEN $${paramCounter} AND $${paramCounter + 1}`;
        params.push(min_score, max_score);
        paramCounter += 2;
      }
    }

    // Contagem total para paginação
    const countQuery = `SELECT COUNT(*) FROM (${query}) as list`;
    const countRes = await pool.query(countQuery, params);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    // Adicionar paginação
    query += ` ORDER BY sa.current_score DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(limit, offset);

    const citizensRes = await pool.query(query, params);

    // Carregar todas as faixas para anexar a faixa atual no JS do frontend
    const tiersRes = await pool.query('SELECT * FROM score_tiers');

    res.json({
      citizens: citizensRes.rows,
      tiers: tiersRes.rows,
      total: totalCount,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar cidadãos: ' + err.message });
  }
});

// Detalhar Cidadão Individual
app.get('/api/admin/citizens/:id', authenticateToken, requireRole(['admin', 'operator', 'auditor']), async (req, res) => {
  const citizenId = req.params.id;

  try {
    const userRes = await pool.query(
      `SELECT u.id, u.username, u.email, u.celular, u.status, u.created_at, sa.current_score
       FROM users u
       JOIN score_accounts sa ON u.id = sa.user_id
       WHERE u.id = $1`,
      [citizenId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cidadão não encontrado.' });
    }

    const citizen = userRes.rows[0];
    const score = citizen.current_score;

    // Faixa atual
    const tierRes = await pool.query(
      'SELECT * FROM score_tiers WHERE min_score <= $1 AND max_score >= $2',
      [score, score]
    );
    const tier = tierRes.rows[0] || null;

    // Histórico de Eventos
    const eventsRes = await pool.query(
      `SELECT se.id, se.points_delta, se.description, se.evidence_url, se.status, se.occurred_at, se.created_at,
             sety.name as type_name, sety.category, u_app.username as approved_by_name
       FROM score_events se
       JOIN score_event_types sety ON se.event_type_id = sety.id
       LEFT JOIN users u_app ON se.approved_by = u_app.id
       WHERE se.user_id = $1
       ORDER BY se.occurred_at DESC`,
      [citizenId]
    );

    // Certificados concedidos
    const certsRes = await pool.query(
      `SELECT mc.*, uc.granted_at 
       FROM user_certificates uc
       JOIN merit_certificates mc ON uc.certificate_id = mc.id
       WHERE uc.user_id = $1`,
      [citizenId]
    );

    res.json({
      citizen,
      tier,
      history: eventsRes.rows,
      certificates: certsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar detalhe do cidadão: ' + err.message });
  }
});

// Cadastrar novo Cidadão pelo Admin
app.post('/api/admin/citizens', authenticateToken, requireRole(['admin', 'operator']), async (req, res) => {
  const { username, email, celular, password } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Nickname é obrigatório.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validar unicidade
    const dupRes = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    if (dupRes.rows.length > 0) {
      return res.status(400).json({ error: 'Nickname já registrado.' });
    }

    if (email) {
      const emailRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (emailRes.rows.length > 0) {
        return res.status(400).json({ error: 'E-mail já cadastrado.' });
      }
    }

    if (celular) {
      const celRes = await client.query('SELECT id FROM users WHERE celular = $1', [celular]);
      if (celRes.rows.length > 0) {
        return res.status(400).json({ error: 'Telefone celular já cadastrado.' });
      }
    }

    const hashed = await bcrypt.hash(password || 'cidadao123', 10);

    const userRes = await client.query(
      `INSERT INTO users (username, email, celular, password_hash, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
      [username, email || null, celular || null, hashed]
    );
    const newUserId = userRes.rows[0].id;

    // Papel citizen
    const roleRes = await client.query("SELECT id FROM roles WHERE name = 'citizen'");
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [newUserId, roleRes.rows[0].id]);

    // Score account
    await client.query('INSERT INTO score_accounts (user_id, current_score) VALUES ($1, 5000)', [newUserId]);

    // Auditoria
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, new_data)
       VALUES ($1, 'users', $2, 'admin_create_citizen', $3)`,
      [req.user.id, newUserId, JSON.stringify({ username, email, celular })]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Cidadão registrado e indexado com sucesso no ILC.', user_id: newUserId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Falha ao criar cidadão pelo administrador: ' + err.message });
  } finally {
    client.release();
  }
});

// Alterar Status do Cidadão (Bloquear/Ativar)
app.post('/api/admin/citizens/:id/status', authenticateToken, requireRole(['admin', 'operator']), async (req, res) => {
  const citizenId = req.params.id;
  const { status } = req.body; // active, inactive, blocked

  if (!['active', 'inactive', 'blocked'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido fornecido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const oldRes = await client.query('SELECT status FROM users WHERE id = $1', [citizenId]);
    if (oldRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cidadão não encontrado.' });
    }
    const oldStatus = oldRes.rows[0].status;

    await client.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [status, citizenId]);

    // Auditoria
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, old_data, new_data)
       VALUES ($1, 'users', $2, 'update_status', $3, $4)`,
      [
        req.user.id,
        citizenId,
        JSON.stringify({ status: oldStatus }),
        JSON.stringify({ status })
      ]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: `Status do cidadão alterado para: ${status}` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao alterar status: ' + err.message });
  } finally {
    client.release();
  }
});

// Registrar Novo Evento de Pontuação (Bônus ou Penalidade)
app.post('/api/admin/events', authenticateToken, requireRole(['admin', 'operator']), async (req, res) => {
  const { user_id, event_type_code, description, evidence_url, status, occurred_at } = req.body;

  if (!user_id || !event_type_code) {
    return res.status(400).json({ error: 'Cidadão e Tipo de Evento são obrigatórios.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obter detalhes do tipo de evento
    const typeRes = await client.query(
      'SELECT id, points_delta, requires_approval FROM score_event_types WHERE code = $1',
      [event_type_code]
    );
    if (typeRes.rows.length === 0) {
      return res.status(400).json({ error: 'Tipo de evento cívico desconhecido.' });
    }

    const { id: eventTypeId, points_delta, requires_approval } = typeRes.rows[0];

    // Determinar status final do evento
    // Se o tipo exige aprovação e foi lançado sem aprovação expressa
    let finalStatus = 'approved';
    if (requires_approval && status !== 'approved') {
      finalStatus = 'pending';
    } else if (status) {
      finalStatus = status; // pode ser pending, approved
    }

    // Se é operador e lança um evento pendente, ou direto aprovado
    const approvedBy = finalStatus === 'approved' ? req.user.id : null;

    const eventInsert = await client.query(
      `INSERT INTO score_events (user_id, event_type_id, points_delta, description, evidence_url, status, occurred_at, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()), $8) RETURNING id`,
      [user_id, eventTypeId, points_delta, description || '', evidence_url || null, finalStatus, occurred_at || null, approvedBy]
    );
    const eventId = eventInsert.rows[0].id;

    // Se for aprovado instantaneamente, atualizar o score
    let scoreDetails = null;
    if (finalStatus === 'approved') {
      scoreDetails = await applyScoreChange(client, user_id, points_delta, req.user.id);
    }

    // Log de auditoria geral
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, new_data)
       VALUES ($1, 'score_events', $2, 'create_event', $3)`,
      [
        req.user.id,
        eventId,
        JSON.stringify({
          user_id,
          event_type_code,
          points_delta,
          status: finalStatus,
          score_details: scoreDetails
        })
      ]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: finalStatus === 'approved' ? 'Evento lançado e pontuação atualizada com sucesso.' : 'Evento registrado e aguardando aprovação.',
      event_id: eventId,
      status: finalStatus,
      score_change: scoreDetails
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao registrar evento de lealdade: ' + err.message });
  } finally {
    client.release();
  }
});

// Resolver (Aprovar / Rejeitar) evento pendente
app.post('/api/admin/events/:id/resolve', authenticateToken, requireRole(['admin', 'operator']), async (req, res) => {
  const eventId = req.params.id;
  const { status } = req.body; // approved, rejected

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Ação de resolução inválida.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obter evento pendente
    const eventRes = await client.query(
      'SELECT user_id, status, points_delta FROM score_events WHERE id = $1 FOR UPDATE',
      [eventId]
    );

    if (eventRes.rows.length === 0) {
      return res.status(404).json({ error: 'Evento cívico não encontrado.' });
    }

    const event = eventRes.rows[0];

    if (event.status !== 'pending') {
      return res.status(400).json({ error: 'Este evento já foi resolvido anteriormente.' });
    }

    // Atualizar status do evento
    await client.query(
      'UPDATE score_events SET status = $1, approved_by = $2 WHERE id = $3',
      [status, req.user.id, eventId]
    );

    let scoreDetails = null;
    if (status === 'approved') {
      scoreDetails = await applyScoreChange(client, event.user_id, event.points_delta, req.user.id);
    }

    // Auditoria
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, old_data, new_data)
       VALUES ($1, 'score_events', $2, 'resolve_event', $3, $4)`,
      [
        req.user.id,
        eventId,
        JSON.stringify({ old_status: 'pending' }),
        JSON.stringify({ new_status: status, score_change: scoreDetails })
      ]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: status === 'approved' ? 'Evento aprovado e pontuação atualizada com sucesso.' : 'Evento rejeitado pelo administrador.',
      status,
      score_change: scoreDetails
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao resolver evento: ' + err.message });
  } finally {
    client.release();
  }
});

// Listar logs de auditoria (Auditor / Admin)
app.get('/api/admin/audit-logs', authenticateToken, requireRole(['admin', 'auditor']), async (req, res) => {
  try {
    const logsRes = await pool.query(
      `SELECT al.*, u.username as actor_name
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 100`
    );
    res.json(logsRes.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria: ' + err.message });
  }
});

// Listar Tipos de Eventos cadastrados
app.get('/api/admin/event-types', authenticateToken, async (req, res) => {
  try {
    const typesRes = await pool.query('SELECT * FROM score_event_types WHERE active = true ORDER BY name ASC');
    res.json(typesRes.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar tipos de eventos: ' + err.message });
  }
});

// Listar Certificados Disponíveis
app.get('/api/admin/certificates', authenticateToken, async (req, res) => {
  try {
    const certsRes = await pool.query('SELECT * FROM merit_certificates ORDER BY points_required ASC');
    res.json(certsRes.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar certificados: ' + err.message });
  }
});

// Outorgar Certificado Manualmente
app.post('/api/admin/certificates/grant', authenticateToken, requireRole(['admin', 'operator']), async (req, res) => {
  const { user_id, certificate_id } = req.body;

  if (!user_id || !certificate_id) {
    return res.status(400).json({ error: 'Cidadão e Certificado são obrigatórios.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar se já tem
    const checkRes = await client.query('SELECT id FROM user_certificates WHERE user_id = $1 AND certificate_id = $2', [user_id, certificate_id]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: 'Este cidadão já possui este certificado.' });
    }

    // Inserir
    await client.query('INSERT INTO user_certificates (user_id, certificate_id) VALUES ($1, $2)', [user_id, certificate_id]);

    // Obter nome para auditoria
    const nameRes = await client.query('SELECT name FROM merit_certificates WHERE id = $1', [certificate_id]);
    const certName = nameRes.rows[0].name;

    // Auditoria
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, new_data)
       VALUES ($1, 'user_certificates', $2, 'grant_manual_certificate', $3)`,
      [
        req.user.id,
        user_id,
        JSON.stringify({ certificate_id, certificate_name: certName })
      ]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: `Certificado [${certName}] outorgado com sucesso.` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao conceder certificado: ' + err.message });
  } finally {
    client.release();
  }
});

// Rota de Teste/Fallback da API
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', system: 'ILC Portal' });
});

// Servir frontend SPA para qualquer outra rota (HTML5 History API)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📡 Portal ILC rodando na porta http://localhost:${PORT}`);
});
