import { InformationState } from "./types";
import {
  objectsEqual,
  WHQ,
  findout,
  consultDB,
  getFactArgument,
} from "./utils";


export const initialIS = (): InformationState => {
  return {
    domain: {
      predicates: {
        favorite_food: "food",
        booking_course: "course",
        booking_day: "day",
      },
      individuals: {
        pizza: "food",
        LT2319: "course",
        friday: "day",
        tuesday: "day",
      },
      plans: [
        {
          type: "issue",
          content: WHQ("booking_day"),
          plan: [
            findout(WHQ("booking_day")),
            findout(WHQ("booking_course")),
            consultDB(WHQ("booking_room")),
          ],
        },
        {
          type: "issue",
          content: WHQ("booking_room"),
          plan: [
            findout(WHQ("booking_day")),
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
          const day = getFactArgument(facts, "booking_day");
          if (course == "LT2319" && day == "friday") {
            return { predicate: "booking_room", argument: "G212" };
          }
          if (course == "LT2319" && day == "tuesday") {
            return { predicate: "booking_room", argument: "J440" };
          }
        }
        return null;
      },
    },
    next_moves: [],
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
