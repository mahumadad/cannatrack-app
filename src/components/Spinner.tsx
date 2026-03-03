const Spinner: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <div style={{ width: 32, height: 32, border: '3px solid #EBE5DC', borderTopColor: '#A68050', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

export default Spinner;
