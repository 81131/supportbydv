import React, { useState } from 'react';
import * as math from 'mathjs';
import { XCircle, Delete } from 'lucide-react';

interface SciCalcProps {
  onClose: () => void;
}

const ScientificCalculator: React.FC<SciCalcProps> = ({ onClose }) => {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const calculate = () => {
    try {
      if (!expression) return;
      const res = math.evaluate(expression);
      setResult(math.format(res, { precision: 10 }));
    } catch (e) {
      setResult("Error");
    }
  };

  const handleChar = (char: string) => {
    setExpression(prev => prev + char);
  };

  return (
    <div style={{ position: 'fixed', bottom: '80px', left: '80px', zIndex: 1000, backgroundColor: 'var(--bg-deep)', border: '1px solid var(--border-dark)', borderRadius: '8px', padding: '1rem', width: '320px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
           <h4 className="text-title" style={{ margin: 0, fontSize: '1rem' }}>Scientific Calculator</h4>
           <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><XCircle size={16} /></button>
       </div>
       
       <div style={{ backgroundColor: 'var(--bg-dark)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-dark)', marginBottom: '1rem', minHeight: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-main)', fontSize: '1.2rem', textAlign: 'right', overflowX: 'auto', whiteSpace: 'nowrap' }}>{expression || '0'}</div>
          {result !== null && (
             <div style={{ color: 'var(--accent-gold)', fontSize: '1.5rem', textAlign: 'right', fontWeight: 'bold' }}>= {result}</div>
          )}
       </div>

       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('sin(')}>sin</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('cos(')}>cos</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('tan(')}>tan</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('log(')}>log</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => {setExpression(''); setResult(null);}}>AC</button>
         
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('sqrt(')}>√</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('^')}>^</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('(')}>(</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar(')')}>)</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center', color: 'var(--accent-red)' }} onClick={() => setExpression(prev => prev.slice(0, -1))}><Delete size={16}/></button>
         
         <button className="btn-solid-gold" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('7')}>7</button>
         <button className="btn-solid-gold" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('8')}>8</button>
         <button className="btn-solid-gold" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('9')}>9</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('/')}>/</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('pi')}>π</button>
         
         <button className="btn-solid-gold" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('4')}>4</button>
         <button className="btn-solid-gold" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('5')}>5</button>
         <button className="btn-solid-gold" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('6')}>6</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('*')}>*</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('e')}>e</button>

         <button className="btn-solid-gold" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('1')}>1</button>
         <button className="btn-solid-gold" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('2')}>2</button>
         <button className="btn-solid-gold" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('3')}>3</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('-')}>-</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('!')}>!</button>
         
         <button className="btn-solid-gold" style={{ padding: '0.4rem', justifyContent: 'center', gridColumn: '1 / span 2' }} onClick={() => handleChar('0')}>0</button>
         <button className="btn-solid-gold" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('.')}>.</button>
         <button className="btn-ghost" style={{ padding: '0.4rem', justifyContent: 'center' }} onClick={() => handleChar('+')}>+</button>
         <button className="btn-primary" style={{ padding: '0.4rem', justifyContent: 'center', backgroundColor: 'var(--accent-gold)', color: 'black' }} onClick={calculate}>=</button>
       </div>
    </div>
  );
};

export default ScientificCalculator;
