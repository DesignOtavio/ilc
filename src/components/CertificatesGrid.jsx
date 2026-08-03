import React from 'react';

const parseSafeCertDate = (dateVal) => {
  if (!dateVal) return new Date().toLocaleDateString('pt-BR');
  if (typeof dateVal === 'string') {
    const isoLike = dateVal.trim().replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:?\d{2}?)*/, '$1T$2');
    const dt = new Date(isoLike);
    if (!isNaN(dt.getTime())) return dt.toLocaleDateString('pt-BR');
  }
  const dt = new Date(dateVal);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('pt-BR');
};

const CertificatesGrid = ({ certificates = [] }) => {
  const officialDecorations = [
    {
      key: 'Estrela da Democracia',
      icon: '🌟',
      desc: 'Concedida por atos de coragem excepcionais em combate e serviço cívico extraordinário.',
      points: 100
    },
    {
      key: 'Ordem da Prosperidade',
      icon: '⚙️',
      desc: 'Para quem impulsionou a economia, indústria, inovação ou infraestrutura nacional.',
      points: 500
    },
    {
      key: 'Medalha da Verdade',
      icon: '📖',
      desc: 'Para serviços excepcionais ao Ministério da Verdade, transparência e à informação.',
      points: 1000
    },
    {
      key: 'Cruz da Defesa Nacional',
      icon: '⚔️',
      desc: 'Por bravura notável na defesa do território, da soberania cívica e do povo.',
      points: 2000
    },
    {
      key: 'Medalha da Expansão',
      icon: '🌐',
      desc: 'Concedida pela conquista, integração ou incorporação de novos territórios e parcerias.',
      points: 3500
    },
    {
      key: 'Ordem da Unidade',
      icon: '🤝',
      desc: 'Para civis e militares que fortaleceram a coesão, a harmonia e a unidade da nação.',
      points: 5000
    },
    {
      key: 'Ordem Suprema do Alto Comando',
      icon: '🎖️',
      desc: 'A maior honra da Democracia Gerenciada, concedida a poucos que serviram além do dever.',
      points: 8000
    }
  ];

  return (
    <div className="decorations-grid">
      {officialDecorations.map(dec => {
        const userCert = certificates.find(uc => 
          uc.name === dec.key || 
          uc.name.toLowerCase().includes(dec.key.toLowerCase().substring(0, 6))
        );
        const isUnlocked = !!userCert;
        const dateString = isUnlocked 
          ? parseSafeCertDate(userCert.granted_at)
          : null;
        
        return (
          <div key={dec.key} className={`decoration-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
            <div className="decoration-icon-box">
              <span>{dec.icon}</span>
            </div>
            <h4 className="decoration-title">{dec.key.toUpperCase()}</h4>
            <p className="decoration-desc">{dec.desc}</p>
            <div className={`decoration-status-pill ${isUnlocked ? 'granted' : 'locked'}`}>
              {isUnlocked ? `🎖️ OUTORGADO (${dateString})` : `🔒 REQUER ${dec.points} PTS`}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CertificatesGrid;

