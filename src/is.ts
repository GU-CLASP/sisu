import InformationState from "./types";
import { objectsEqual} from "./utils";

export const initialIS = (): InformationState => {
  return {
    domain: {
      relevant: (a, q) => {
        return objectsEqual(q, (x) => ({"predicate": "favorite_food", "argument": x})) &&
          ["pizza", {"predicate": "favorite_food", "argument": "pizza"}].some(y => objectsEqual(a, y));
      },
      resolves: (a, q) => {
        return objectsEqual(q, (x) => ({"predicate": "favorite_food", "argument": x})) &&
          objectsEqual(a, {"predicate": "favorite_food", "argument": "pizza"});
      },
      plans: [
        {
          "type": "question",
          "content": (x) => ({"predicate": "booking_room", "argument": x}),
          "plan": [
            {
              type: "findout",
              content: {
                type: "wh_question",
                predicate: "booking_course",
              },
            },
          ],
        }
      ],
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
