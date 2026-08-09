import { useState, useEffect } from 'react';
import './App.css'

function App() {
  const [texto, setTexto] = useState('Toque e fale comigo');
  const [ouvindo, setOuvindo] = useState(false);
  const [glosa, setGlosa] = useState('');

  // Tradutor simples pra Glosa
  function traduzirParaLibras(frase) {
    let g = frase.toUpperCase();
    g = g.replace(/VOCES/g, 'VOCE').replace(/ESTA/g, 'ESTAR')
        .replace(/TUDO BEM/g, 'TUDO BEM?').replace(/EU /g, 'EU ');
    setGlosa(g);
  }

  function comecarOuvir() {
    setOuvindo(true);
    setTexto('Ouvindo... pode falar!');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'pt-BR';
      rec.continuous = false;
      rec.onresult = (e) => {
        const t = e.results[0][0].transcript;
        setTexto(t);
        traduzirParaLibras(t);
        setOuvindo(false);
      };
      rec.onerror = () => { setTexto('Erro no microfone'); setOuvindo(false); };
      rec.onend = () => setOuvindo(false);
      rec.start();
    } else {
      setTexto('Navegador não suporta voz');
    }
  }

  function pararOuvir() { setOuvindo(false); }

  return (
    <div className="container">
      <h1>AURORA</h1>
      <p className="sub">A Luz que Traduz</p>

      <div className="tela">
        <p className="texto">{texto}</p>
        {glosa && <p className="glosa">GLOSA: {glosa}</p>}
      </div>
      
      {/* WIDGET DO VLibras - PASSO 5 */}
      <div vw className="enabled">
        <div vw-access-button className="active"></div>
        <div vw-plugin-wrapper></div>
      </div>

      <button 
        className={`botao ${ouvindo? 'gravando' : ''}`}
        onMouseDown={comecarOuvir}
        onMouseUp={pararOuvir}
        onTouchStart={comecarOuvir}
        onTouchEnd={pararOuvir}
      >
        {ouvindo? 'SOLTE PRA ENVIAR' : 'SEGURE PRA FALAR'}
      </button>
    </div>
  )
}

export default App
