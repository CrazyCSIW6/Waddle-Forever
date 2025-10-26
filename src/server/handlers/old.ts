import loginHandler from './play/login';
import engine1 from './play/engine1';
import navigationHandler from './play/navigation';
import puckHandler from './play/puck';
import mancalaHandler from './games/mancala';
import { Handler } from '.';

const handler = new Handler();
handler.use(loginHandler);
handler.use(engine1);
handler.use(navigationHandler);
handler.use(puckHandler);
handler.use(mancalaHandler);

export default handler;