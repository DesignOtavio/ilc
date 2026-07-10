import React from 'react';

const CertificatesGrid = ({ certificates }) => {
  const allCerts = [
    { key: 'Mérito Cívico', points: 100, desc: 'Concedido ao cidadão que atinge seus primeiros 100 pontos acumulados em atos de cooperação social.' },
    { key: 'Serviço Distinto', points: 500, desc: 'Reconhecimento oficial por 500 pontos acumulados em atividades de apoio e valor militar/cívico.' },
    { key: 'Excelência Nacional', points: 1000, desc: 'Diploma solene outorgado por expressiva contribuição cívica nacional, somando 1.000 pontos.' },
    { key: 'Honra Suprema', points: 5000, desc: 'Ordem máxima da lealdade nacional. Reservado para cidadãos que dedicaram 5.000 pontos em mérito cívico.' }
  ];

  return (
    <div className="certificates-grid">
      {allCerts.map(cert => {
        const userCert = certificates.find(uc => uc.name === cert.key);
        const isUnlocked = !!userCert;
        const dateString = isUnlocked ? new Date(userCert.granted_at).toLocaleDateString('pt-BR') : 'BLOQUEADO';
        
        return (
          <div key={cert.key} className={`certificate-banknote ${isUnlocked ? 'unlocked' : 'locked'}`}>
            <div className="border-lines"></div>
            <div className="banknote-header">
              <span>REPÚBLICA CÍVICA NACIONAL</span>
              <span>VALOR SOCIAL: {cert.points} PTS</span>
            </div>
            <div className={`banknote-body ${isUnlocked ? 'unlocked' : ''}`}>
              <h3 className="banknote-title">{cert.key.toUpperCase()}</h3>
              <p className="banknote-desc">{cert.desc}</p>
            </div>
            <div className="banknote-footer">
              <div>
                <span>REGISTRO: {isUnlocked ? userCert.id.substring(0, 8).toUpperCase() : 'PENDENTE'}</span><br />
                <span>OUTORGA: {dateString}</span>
              </div>
              {isUnlocked ? (
                <div className="banknote-stamp">OUTORGADO</div>
              ) : (
                <div className="banknote-stamp" style={{ borderColor: '#555', color: '#555' }}>PENDENTE</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CertificatesGrid;
