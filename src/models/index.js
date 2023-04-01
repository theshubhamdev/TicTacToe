// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';

const Players = {
  "X": "X",
  "O": "O"
};

const { Game } = initSchema(schema);

export {
  Game,
  Players
};