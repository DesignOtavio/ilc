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
app.set('trust proxy', 1); // Confia em proxies reversos (Nginx/Easypanel/Cloudflare) para HTTPS e cookies

app.use(express.json());

// Sessão para suportar o fluxo OAuth do Google
app.use(session({
  secret: process.env.SESSION_SECRET || 'ilc-session-secret-fallback',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
    maxAge: 10 * 60 * 1000 // 10min para o flow OAuth
  }
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
    try {
      const avatar_url = profile.photos && profile.photos[0] ? profile.photos[0].value : (profile._json && profile._json.picture ? profile._json.picture : null);
      return done(null, {
        google_id: profile.id,
        email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
        name: profile.displayName,
        avatar_url
      });
    } catch (err) {
      return done(err);
    }
  }));

  // Iniciar fluxo OAuth — redireciona para o Google
  app.get('/api/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));

  // Callback do Google após autenticação
  async function handleGoogleCallback(req, res) {
    const { google_id, email, avatar_url } = req.user;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verificar se já existe conta com esse google_id
      let userRes = await client.query(
        `SELECT u.id, u.username, u.hierarchy_title, u.avatar_url, COALESCE(r.name, 'usuario') as role
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.google_id = $1`,
        [google_id]
      );

      if (userRes.rows.length > 0) {
        // Conta existente — atualizar foto se veio do Google
        const user = userRes.rows[0];
        let currentAvatar = user.avatar_url;

        if (avatar_url && (!currentAvatar || currentAvatar.includes('googleusercontent.com'))) {
          await client.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatar_url, user.id]);
          currentAvatar = avatar_url;
        }

        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role, hierarchy_title: user.hierarchy_title || 'Usuário', avatar_url: currentAvatar },
          JWT_SECRET,
          { expiresIn: '8h' }
        );
        await client.query('COMMIT');
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
      const tempToken = jwt.sign({ google_id, email, avatar_url, needs_nickname: true }, JWT_SECRET, { expiresIn: '15m' });
      return res.redirect(`/?google_new=1&google_temp=${tempToken}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Erro interno no handleGoogleCallback:', err);
      return res.redirect('/?google_error=server');
    } finally {
      client.release();
    }
  }

  app.get('/api/auth/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, async (err, user, info) => {
      if (err) {
        console.error('❌ OAuth token exchange error (Google Callback Error):', err.message || err);
        if (err.oauthError) {
          console.error('❌ Google oauthError details:', {
            statusCode: err.oauthError.statusCode,
            data: err.oauthError.data ? err.oauthError.data.toString() : null
          });
        }
        return res.redirect('/?google_error=server');
      }

      if (!user) {
        console.warn('⚠️ OAuth callback: no user returned from passport. Info:', info);
        return res.redirect('/?google_error=1');
      }

      req.user = user;
      try {
        await handleGoogleCallback(req, res);
      } catch (handlerErr) {
        console.error('❌ Error handling Google callback:', handlerErr);
        return res.redirect('/?google_error=server');
      }
    })(req, res, next);
  });
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
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS hierarchy_title VARCHAR(150) DEFAULT \'Usuário\'');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT');
  
  try {
    await pool.query('ALTER TABLE roles ALTER COLUMN name TYPE VARCHAR(50)');
  } catch (e) {
    // Ignora se for enum ou já alterado
  }

  await pool.query("INSERT INTO roles (name, description) VALUES ('admin', 'Acesso administrativo total ao sistema') ON CONFLICT DO NOTHING");
  await pool.query("INSERT INTO roles (name, description) VALUES ('usuario', 'Acesso padrão de usuário/cidadão ao sistema') ON CONFLICT DO NOTHING");

  const usuarioRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'usuario'");
  if (usuarioRoleRes.rows.length > 0) {
    const usuarioRoleId = usuarioRoleRes.rows[0].id;
    await pool.query(`
      UPDATE users u
      SET hierarchy_title = CASE 
        WHEN r.name = 'operator' AND (u.hierarchy_title IS NULL OR u.hierarchy_title = 'Usuário') THEN 'Operador de Campo'
        WHEN r.name = 'auditor' AND (u.hierarchy_title IS NULL OR u.hierarchy_title = 'Usuário') THEN 'Auditor Cívico'
        WHEN r.name = 'citizen' AND (u.hierarchy_title IS NULL OR u.hierarchy_title = 'Usuário') THEN 'Cidadão Cívico'
        WHEN r.name = 'admin' AND (u.hierarchy_title IS NULL OR u.hierarchy_title = 'Usuário') THEN 'Comissário Chefe'
        ELSE COALESCE(u.hierarchy_title, 'Usuário')
      END
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = ur.user_id AND r.name IN ('operator', 'auditor', 'citizen', 'admin')
    `);

    await pool.query(`
      UPDATE user_roles
      SET role_id = $1
      WHERE role_id IN (SELECT id FROM roles WHERE name IN ('operator', 'auditor', 'citizen'))
    `, [usuarioRoleId]);
  }
}

// Inicialização e Carga Base de Usuários (Se necessário)
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(res.rows[0].count, 10);

    if (userCount === 0) {
      console.log('🌱 Banco de dados limpo detectado. Iniciando semente de usuários administrativos e cidadãos...');
      await client.query('BEGIN');

      const adminRoleId = (await client.query("SELECT id FROM roles WHERE name = 'admin'")).rows[0].id;
      const usuarioRoleId = (await client.query("SELECT id FROM roles WHERE name = 'usuario'")).rows[0].id;

      const adminPass = await bcrypt.hash('admin123', 10);
      const userPass = await bcrypt.hash('usuario123', 10);

      // 1. Cadastrar Administrador
      const adminRes = await client.query(
        `INSERT INTO users (username, email, celular, password_hash, hierarchy_title, avatar_url)
         VALUES ('comissario_otavio', 'admin@ilc.gov', '+5511999999999', $1, 'Comissário Chefe', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300') RETURNING id`,
        [adminPass]
      );
      const adminId = adminRes.rows[0].id;
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [adminId, adminRoleId]);
      await client.query('INSERT INTO score_accounts (user_id, current_score) VALUES ($1, 9500)', [adminId]);

      // 2. Cadastrar Usuários de Demonstração com Títulos Personalizados
      const demoUsers = [
        { name: 'operador_civil', email: 'operator@ilc.gov', phone: '+5511888888888', score: 7500, title: 'Operador de Campo', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300' },
        { name: 'auditor_patria', email: 'auditor@ilc.gov', phone: '+5511777777777', score: 6200, title: 'Auditor Cívico Sênior', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300' },
        { name: 'joao_silva', email: 'joao.silva@cidadania.br', phone: '+5511911112222', score: 5000, title: 'Cidadão Ativo', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300' },
        { name: 'elena_rostova', email: 'elena.rostova@cidadania.br', phone: '+5511922223333', score: 8200, title: 'Inspetora Comunitária', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300' },
        { name: 'carlos_antunes', email: 'carlos.antunes@cidadania.br', phone: '+5511933334444', score: 1200, title: 'Cidadão sob Observação', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300' }
      ];

      for (const cit of demoUsers) {
        const uRes = await client.query(
          `INSERT INTO users (username, email, celular, password_hash, hierarchy_title, avatar_url)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [cit.name, cit.email, cit.phone, userPass, cit.title, cit.avatar]
        );
        const uId = uRes.rows[0].id;
        await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [uId, usuarioRoleId]);
        await client.query('INSERT INTO score_accounts (user_id, current_score) VALUES ($1, $2)', [uId, cit.score]);

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
    if (!req.user) {
      return res.status(403).json({ error: 'Você não tem permissão cívica para acessar este recurso.' });
    }
    const userRole = req.user.role;
    if (userRole === 'admin') {
      return next();
    }

    const isAllowed = allowedRoles.some(r => {
      if (r === userRole) return true;
      if (['usuario', 'user', 'citizen', 'operator', 'auditor'].includes(r) && userRole === 'usuario') return true;
      return false;
    });

    if (!isAllowed) {
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


// ======// Registrar cidadão comum
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
    const defaultTitle = 'Cidadão Cívico';

    // Criar Usuário
    const userInsert = await client.query(
      `INSERT INTO users (username, email, celular, password_hash, hierarchy_title, status)
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id`,
      [username, email || null, celular || null, passwordHash, defaultTitle]
    );
    const userId = userInsert.rows[0].id;

    // Associar papel base 'usuario'
    let roleRes = await client.query("SELECT id FROM roles WHERE name = 'usuario'");
    if (roleRes.rows.length === 0) {
      roleRes = await client.query("SELECT id FROM roles WHERE name = 'citizen'");
    }
    const usuarioRoleId = roleRes.rows[0].id;
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, usuarioRoleId]);

    // Inicializar conta de pontos (5.000 pontos padrão)
    await client.query('INSERT INTO score_accounts (user_id, started_score, current_score) VALUES ($1, 5000, 5000)', [userId]);

    // Auditoria
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, new_data)
       VALUES ($1, 'users', $2, 'citizen_self_register', $3)`,
      [userId, userId, JSON.stringify({ username, email, celular, hierarchy_title: defaultTitle })]
    );

    await client.query('COMMIT');

    // Gerar Token
    const token = jwt.sign(
      { id: userId, username, email, role: 'usuario', hierarchy_title: defaultTitle, avatar_url: null },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, role: 'usuario', username, hierarchy_title: defaultTitle, avatar_url: null });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Falha ao registrar cidadão: ' + err.message });
  } finally {
    client.release();
  }
});

// Completar Cadastro via Google (aceita temp_token do callback OAuth ou dados diretos)
app.post('/api/auth/google-signup', async (req, res) => {
  let google_id, email, avatar_url;
  const { temp_token, username } = req.body;

  if (temp_token) {
    try {
      const decoded = jwt.verify(temp_token, JWT_SECRET);
      if (!decoded.needs_nickname) {
        return res.status(400).json({ error: 'Token temporário inválido.' });
      }
      google_id = decoded.google_id;
      email = decoded.email;
      avatar_url = decoded.avatar_url;
    } catch (err) {
      return res.status(401).json({ error: 'Token temporário expirado ou inválido. Inicie o processo novamente.' });
    }
  } else {
    google_id = req.body.google_id;
    email = req.body.email;
    avatar_url = req.body.avatar_url;
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

    let userRes = await client.query(
      `SELECT u.id, u.username, u.hierarchy_title, u.avatar_url, r.name as role
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE u.google_id = $1`,
      [google_id]
    );

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, hierarchy_title: user.hierarchy_title || 'Usuário', avatar_url: user.avatar_url },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
      await client.query('COMMIT');
      return res.json({ token, role: user.role, username: user.username, hierarchy_title: user.hierarchy_title || 'Usuário', avatar_url: user.avatar_url });
    }

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

    const defaultTitle = 'Cidadão Cívico';
    const uInsert = await client.query(
      `INSERT INTO users (username, email, google_id, hierarchy_title, avatar_url, status)
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id`,
      [username, email || null, google_id, defaultTitle, avatar_url || null]
    );
    const userId = uInsert.rows[0].id;

    let roleRes = await client.query("SELECT id FROM roles WHERE name = 'usuario'");
    if (roleRes.rows.length === 0) {
      roleRes = await client.query("SELECT id FROM roles WHERE name = 'citizen'");
    }
    const usuarioRoleId = roleRes.rows[0].id;
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, usuarioRoleId]);

    await client.query('INSERT INTO score_accounts (user_id, current_score) VALUES ($1, 5000)', [userId]);

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, new_data)
       VALUES ($1, 'users', $2, 'google_signup', $3)`,
      [userId, userId, JSON.stringify({ username, email, google_id, avatar_url, hierarchy_title: defaultTitle })]
    );

    await client.query('COMMIT');

    const token = jwt.sign(
      { id: userId, username, role: 'usuario', hierarchy_title: defaultTitle, avatar_url: avatar_url || null },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, role: 'usuario', username, hierarchy_title: defaultTitle, avatar_url: avatar_url || null });
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

    const userRole = user.role_name === 'admin' ? 'admin' : 'usuario';
    const hierarchyTitle = user.hierarchy_title || (userRole === 'admin' ? 'Administrador do Sistema' : 'Usuário Cívico');

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: userRole, hierarchy_title: hierarchyTitle, avatar_url: user.avatar_url },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      role: userRole,
      username: user.username,
      hierarchy_title: hierarchyTitle,
      avatar_url: user.avatar_url
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor durante login: ' + err.message });
  }
});


// ==========================================
// ROTAS DO CIDADÃO / USUÁRIO (API)
// ==========================================

// Obter dados do cidadão autenticado
app.get('/api/citizen/me', authenticateToken, requireRole(['usuario', 'admin']), async (req, res) => {
  try {
    const citizenId = req.user.id;

    const citizenRes = await pool.query(
      `SELECT u.id, u.username, u.email, u.celular, u.status, u.hierarchy_title, u.avatar_url, r.name as role
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1`,
      [citizenId]
    );

    if (citizenRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const citizen = citizenRes.rows[0];

    // Obter pontuação
    const scoreRes = await pool.query('SELECT current_score FROM score_accounts WHERE user_id = $1', [citizenId]);
    const score = scoreRes.rows.length > 0 ? scoreRes.rows[0].current_score : 5000;
    citizen.current_score = score;

    const tierRes = await pool.query(
      `SELECT * FROM score_tiers WHERE min_score <= $1 AND max_score >= $2`,
      [score, score]
    );
    const tier = tierRes.rows[0] || null;

    const nextTierRes = await pool.query(
      `SELECT * FROM score_tiers WHERE min_score > $1 ORDER BY min_score ASC LIMIT 1`,
      [score]
    );
    const nextTier = nextTierRes.rows[0] || null;

    const certsRes = await pool.query(
      `SELECT mc.*, uc.granted_at 
       FROM user_certificates uc
       JOIN merit_certificates mc ON uc.certificate_id = mc.id
       WHERE uc.user_id = $1`,
      [citizenId]
    );

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

// Alterar Perfil (Nickname, Avatar/Foto da Carteira ou Título)
app.put('/api/citizen/update-profile', authenticateToken, async (req, res) => {
  const { nickname, avatar_url, hierarchy_title } = req.body;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Se forneceu nickname, validar unicidade
    if (nickname && nickname.trim() !== '') {
      const dupRes = await client.query('SELECT id FROM users WHERE username = $1 AND id <> $2', [nickname.trim(), userId]);
      if (dupRes.rows.length > 0) {
        return res.status(400).json({ error: 'Este nickname já está em uso por outro cidadão.' });
      }
      await client.query('UPDATE users SET username = $1 WHERE id = $2', [nickname.trim(), userId]);
    }

    if (avatar_url !== undefined) {
      await client.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatar_url || null, userId]);
    }

    if (hierarchy_title !== undefined && hierarchy_title.trim() !== '') {
      await client.query('UPDATE users SET hierarchy_title = $1 WHERE id = $2', [hierarchy_title.trim(), userId]);
    }

    await client.query('UPDATE users SET updated_at = NOW() WHERE id = $2', [userId]);

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, new_data)
       VALUES ($1, 'users', $2, 'update_user_profile', $3)`,
      [userId, userId, JSON.stringify({ nickname, avatar_url: avatar_url ? 'updated' : 'unchanged', hierarchy_title })]
    );

    await client.query('COMMIT');

    const updatedUserRes = await pool.query(
      `SELECT u.username, u.hierarchy_title, u.avatar_url, r.name as role
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );
    const updated = updatedUserRes.rows[0];

    res.json({
      success: true,
      message: 'Perfil e Carteira de Identidade Cívica atualizados com sucesso.',
      nickname: updated.username,
      hierarchy_title: updated.hierarchy_title,
      avatar_url: updated.avatar_url
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao atualizar perfil: ' + err.message });
  } finally {
    client.release();
  }
});

// Retrocompatibilidade para antiga rota update-nickname
app.put('/api/citizen/update-nickname', authenticateToken, async (req, res) => {
  return app._router.handle({ ...req, url: '/api/citizen/update-profile', method: 'PUT' }, res);
});


// ==========================================
// ROTAS DE ADMINISTRAÇÃO (API COM RBAC)
// ==========================================

// Métricas Gerais do Dashboard do Admin
app.get('/api/admin/metrics', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM users');
    const totalCitizens = parseInt(countRes.rows[0].count, 10);

    const avgRes = await pool.query('SELECT AVG(current_score) as avg_score FROM score_accounts');
    const averageScore = parseFloat(avgRes.rows[0].avg_score || 0).toFixed(1);

    const distRes = await pool.query(`
      SELECT 
        t.name as tier_name, 
        t.color,
        COUNT(sa.id) as count
      FROM score_tiers t
      LEFT JOIN score_accounts sa ON sa.current_score BETWEEN t.min_score AND t.max_score
      GROUP BY t.id, t.name, t.color, t.min_score
      ORDER BY t.min_score ASC
    `);

    const pendingEventsRes = await pool.query(`
      SELECT se.id, se.points_delta, se.description, se.created_at, u.username as citizen_name, sety.name as type_name
      FROM score_events se
      JOIN users u ON se.user_id = u.id
      JOIN score_event_types sety ON se.event_type_id = sety.id
      WHERE se.status = 'pending'
      ORDER BY se.created_at DESC
      LIMIT 10
    `);

    const alertRes = await pool.query('SELECT COUNT(*) FROM score_accounts WHERE current_score < 2000');

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

// Listagem de Usuários com filtros
app.get('/api/admin/citizens', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { search, status, tier, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT u.id, u.username, u.email, u.celular, u.status, u.hierarchy_title, u.avatar_url, r.name as role_name,
             COALESCE(sa.current_score, 5000) as current_score, sa.updated_at,
             (SELECT COUNT(*) FROM score_events WHERE user_id = u.id AND points_delta > 0 AND status = 'approved') as rewards_count,
             (SELECT COUNT(*) FROM score_events WHERE user_id = u.id AND points_delta < 0 AND status = 'approved') as penalties_count
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN score_accounts sa ON u.id = sa.user_id
      WHERE 1=1
    `;

    const params = [];
    let paramCounter = 1;

    if (search) {
      query += ` AND (u.username ILIKE $${paramCounter} OR u.email ILIKE $${paramCounter} OR u.celular ILIKE $${paramCounter} OR u.hierarchy_title ILIKE $${paramCounter})`;
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

    const countQuery = `SELECT COUNT(*) FROM (${query}) as list`;
    const countRes = await pool.query(countQuery, params);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    query += ` ORDER BY COALESCE(sa.current_score, 5000) DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(limit, offset);

    const citizensRes = await pool.query(query, params);
    const tiersRes = await pool.query('SELECT * FROM score_tiers');

    res.json({
      citizens: citizensRes.rows,
      tiers: tiersRes.rows,
      total: totalCount,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar usuários: ' + err.message });
  }
});

// Detalhar Usuário Individual
app.get('/api/admin/citizens/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const citizenId = req.params.id;

  try {
    const userRes = await pool.query(
      `SELECT u.id, u.username, u.email, u.celular, u.status, u.hierarchy_title, u.avatar_url, u.created_at, r.name as role_name,
              COALESCE(sa.current_score, 5000) as current_score
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       LEFT JOIN score_accounts sa ON u.id = sa.user_id
       WHERE u.id = $1`,
      [citizenId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const citizen = userRes.rows[0];
    const score = citizen.current_score;

    const tierRes = await pool.query(
      'SELECT * FROM score_tiers WHERE min_score <= $1 AND max_score >= $2',
      [score, score]
    );
    const tier = tierRes.rows[0] || null;

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
    res.status(500).json({ error: 'Erro ao buscar detalhe do usuário: ' + err.message });
  }
});

// Cadastrar novo Usuário pelo Admin (com Título Personalizado, Nível e Foto)
app.post('/api/admin/citizens', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { username, email, celular, password, role = 'usuario', hierarchy_title, avatar_url } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Nickname é obrigatório.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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

    const hashed = await bcrypt.hash(password || 'usuario123', 10);
    const targetTitle = hierarchy_title || (role === 'admin' ? 'Administrador do Sistema' : 'Usuário Cívico');

    const userRes = await client.query(
      `INSERT INTO users (username, email, celular, password_hash, hierarchy_title, avatar_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING id`,
      [username, email || null, celular || null, hashed, targetTitle, avatar_url || null]
    );
    const newUserId = userRes.rows[0].id;

    // Buscar ID da role solicitada ('admin' ou 'usuario')
    const targetRoleName = role === 'admin' ? 'admin' : 'usuario';
    let targetRoleRes = await client.query('SELECT id FROM roles WHERE name = $1', [targetRoleName]);
    if (targetRoleRes.rows.length === 0) {
      targetRoleRes = await client.query("SELECT id FROM roles WHERE name = 'usuario'");
    }
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [newUserId, targetRoleRes.rows[0].id]);

    await client.query('INSERT INTO score_accounts (user_id, current_score) VALUES ($1, 5000)', [newUserId]);

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, new_data)
       VALUES ($1, 'users', $2, 'admin_create_user', $3)`,
      [req.user.id, newUserId, JSON.stringify({ username, email, role: targetRoleName, hierarchy_title: targetTitle, avatar_url })]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Usuário registrado com sucesso no sistema.', user_id: newUserId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Falha ao criar usuário pelo administrador: ' + err.message });
  } finally {
    client.release();
  }
});

// Atualizar Usuário pelo Admin (Editar Nível de Acesso, Título Personalizado e Foto)
app.put('/api/admin/citizens/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const citizenId = req.params.id;
  const { username, email, celular, role, hierarchy_title, avatar_url, status } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userCheck = await client.query('SELECT id, username, status FROM users WHERE id = $1', [citizenId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (username && username.trim() !== '') {
      const dupRes = await client.query('SELECT id FROM users WHERE username = $1 AND id <> $2', [username.trim(), citizenId]);
      if (dupRes.rows.length > 0) {
        return res.status(400).json({ error: 'Nickname em uso por outro usuário.' });
      }
      await client.query('UPDATE users SET username = $1 WHERE id = $2', [username.trim(), citizenId]);
    }

    if (email !== undefined) {
      await client.query('UPDATE users SET email = $1 WHERE id = $2', [email || null, citizenId]);
    }

    if (celular !== undefined) {
      await client.query('UPDATE users SET celular = $1 WHERE id = $2', [celular || null, citizenId]);
    }

    if (hierarchy_title !== undefined && hierarchy_title.trim() !== '') {
      await client.query('UPDATE users SET hierarchy_title = $1 WHERE id = $2', [hierarchy_title.trim(), citizenId]);
    }

    if (avatar_url !== undefined) {
      await client.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatar_url || null, citizenId]);
    }

    if (status && ['active', 'inactive', 'blocked'].includes(status)) {
      await client.query('UPDATE users SET status = $1 WHERE id = $2', [status, citizenId]);
    }

    if (role && ['admin', 'usuario'].includes(role)) {
      let roleRes = await client.query('SELECT id FROM roles WHERE name = $1', [role]);
      if (roleRes.rows.length > 0) {
        const newRoleId = roleRes.rows[0].id;
        await client.query('DELETE FROM user_roles WHERE user_id = $1', [citizenId]);
        await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [citizenId, newRoleId]);
      }
    }

    await client.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [citizenId]);

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, new_data)
       VALUES ($1, 'users', $2, 'admin_update_user', $3)`,
      [req.user.id, citizenId, JSON.stringify({ username, role, hierarchy_title, avatar_url, status })]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Dados do usuário atualizados com sucesso.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao atualizar usuário: ' + err.message });
  } finally {
    client.release();
  }
});

// Alterar Status do Cidadão (Bloquear/Ativar)
app.post('/api/admin/citizens/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  const citizenId = req.params.id;
  const { status } = req.body;

  if (!['active', 'inactive', 'blocked'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido fornecido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const oldRes = await client.query('SELECT status FROM users WHERE id = $1', [citizenId]);
    if (oldRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const oldStatus = oldRes.rows[0].status;

    await client.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [status, citizenId]);

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
    res.json({ success: true, message: `Status do usuário alterado para: ${status}` });
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
