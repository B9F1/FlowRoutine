import React from 'react';
import './TimerModal.css';

export default function TimerModal() {
  const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#34495e'];

  return (
    <div className="timer-modal">
      <header className="modal-header">
        <h1>FlowRoutine</h1>
        <nav className="tab-nav">
          <button className="tab active">타이머 목록</button>
          <button className="tab">설정</button>
        </nav>
      </header>

      <section className="section">
        <h2>기본 라벨 설정</h2>
        <div className="field">
          <label>기본 타이머 라벨</label>
          <input type="text" placeholder="work-timer" />
          <button className="primary">저장</button>
        </div>
      </section>

      <section className="section">
        <h2>타이머 타입 관리</h2>
        <div className="field">
          <label>현재 타이머 타입</label>
          <div className="current-types">업무, 휴식, 브레이크</div>
        </div>
        <div className="field">
          <label>새 타이머 타입 추가</label>
          <input type="text" placeholder="타이머 타입 이름을 선택하세요" />
          <div className="color-picker">
            {colors.map((color) => (
              <span key={color} className="color" style={{ backgroundColor: color }} />
            ))}
          </div>
          <button className="primary">+ 타입 추가</button>
        </div>
      </section>
    </div>
  );
}
