import React from 'react';

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
          ? new Date(userCert.granted_at || Date.now()).toLocaleDateString('pt-BR') 
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

