import { InformationState } from "./types";
import {
  objectsEqual,
  WHQ,
  findout,
  consultDB,
  getFactArgument,
} from "./utils";

export const initialIS = (): InformationState => {
  const predicates: { [index: string]: string } = {
    // Mapping from predicate to sort
    favorite_food: "food",
    booking_course: "course",
  };
  const individuals: { [index: string]: string } = {
    // Mapping from individual to sort
    pizza: "food",
    LT2319: "course",
  };
  return {
    domain: {
      predicates: predicates,
      individuals: individuals,
      relevant: (a, q) => {
        if (
          typeof a === "string" &&
          predicates[q.predicate] === individuals[a]
        ) {
          return true;
        }
        if (typeof a === "object" && q.predicate === a.predicate) {
          return true;
        }
        return false;
      },
      resolves: (a, q) => {
        if (typeof a === "object" && q.predicate === a.predicate) {
          return true;
        }
        return false;
      },
      combine: (q, a) => {
        if (
          typeof a === "string" &&
          predicates[q.predicate] === individuals[a]
        ) {
          return { predicate: q.predicate, argument: a };
        }
        if (typeof a === "object" && q.predicate === a.predicate) {
          return a;
        }
        throw new Error("Combine failed.");
      },
      plans: [
        {
          type: "issue",
          content: WHQ("booking_room"),
          plan: [
            findout(WHQ("booking_course")),
            consultDB(WHQ("booking_room")),
          ],
        },
      ],
    },
    database: {
      consultDB: (question, facts) => {
        if (objectsEqual(question, WHQ("booking_room"))) {
          const course = getFactArgument(facts, "booking_course");
          if (course == "LT2319") {
            return { predicate: "booking_room", argument: "G212" };
          }
        }
        return null;
      },
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
      bel: [{ predicate: "favorite_food", argument: "pizza" }],
    },
    shared: { lu: undefined, qud: [], com: [] },
  };
};
