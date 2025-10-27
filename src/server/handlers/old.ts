import loginHandler from './play/login';
import engine1 from './play/engine1';
import engine1Igloo from './play/engine1Igloo';
import navigationHandler from './play/navigation';
import puckHandler from './play/puck';
import tableHandler from './table';
import { Handler } from '.';

const handler = new Handler();

handler.use(loginHandler);
handler.use(engine1);
handler.use(engine1Igloo);
handler.use(navigationHandler);
handler.use(puckHandler);
handler.use(tableHandler);

export default handler;