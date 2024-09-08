import InformationState from "./types";
import { objectsEqual} from "./utils";

export const initialIS = (): InformationState => {
  return {
    domain: {
      relevant: (a, q) => {
        if(
          objectsEqual(q, (x) => ({"predicate": "favorite_food", "argument": x})) &&
          ["pizza", {"predicate": "favorite_food", "argument": "pizza"}].some(y => objectsEqual(a, y))
        ) {
          return true;
        }

        if(
          objectsEqual(q, (x) => ({"predicate": "booking_course", "argument": x})) &&
          ["LT2319", {"predicate": "booking_course", "argument": "LT2319"}].some(y => objectsEqual(a, y))
        ) {
          return true;
        }
        return false;
      },
      resolves: (a, q) => {
        if(objectsEqual(q, (x) => ({"predicate": "favorite_food", "argument": x})) &&
          objectsEqual(a, {"predicate": "favorite_food", "argument": "pizza"})) {
            return true;
        }
        if(objectsEqual(q, (x) => ({"predicate": "booking_course", "argument": x})) &&
          objectsEqual(a, {"predicate": "booking_course", "argument": "LT2319"})) {
            return true;
        }
        return false;
      },
      plans: [
        {
          "type": "question",
          "content": (x) => ({"predicate": "booking_room", "argument": x}),
          "plan": [
            {
              type: "findout",
              content: (x) => ({"predicate": "booking_course", "argument": x}),
            },
            {
              type: "consultDB",
              content: (x) => ({"predicate": "booking_room", "argument": x}),
            },
          ],
        }
      ],
    },
    database: {
      consultDB: (question, facts) => {
        return {"predicate": "booking_room", "argument": "G212"}
      }
    },
    next_move: null,
    private: {
      plan: [],
      agenda: [
        {
          type: "greet",
          content: null,
        },
      ],
      bel: [{"predicate": "favorite_food", "argument": "pizza"}],
    },
    shared: { lu: undefined, qud: [], com: [] },
  }
};
