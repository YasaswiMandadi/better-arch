import { makeSiteHandler } from './_lib/http.js';
import { mongoStore } from './_lib/mongo.js';

export default makeSiteHandler(mongoStore);
