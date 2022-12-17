import './App.scss';
import { Router } from './components/layout/Router';
import ReactGA from 'react-ga4';

ReactGA.initialize("G-W0EDGX3KYV");

function App() {
  return (
    <>
      <Router />
    </>
  );
}

export default App;
