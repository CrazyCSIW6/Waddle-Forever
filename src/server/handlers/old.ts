import loginHandler from './play/login';
import engine1 from './play/engine1';
import puckHandler from './play/puck';
import { Handler } from '.';

const handler = new Handler();
handler.use(loginHandler);
handler.use(engine1);
handler.use(puckHandler);

export default handler;