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
    booking_day: "day",
    //end: "end"
  };
  const individuals: { [index: string]: string } = {
    // Mapping from individual to sort
    pizza: "food",
    LT2319: "course",
    friday: "day",
    thursday: "day",
   // end: "end"
  };
  return {
    domain: {
      predicates: predicates,
      individuals: individuals,
      plans: [
        {
          type: "issue",
          content: WHQ("booking_room"),
          plan: [
            //The system is 'extended' but rigid in another way now, as the user can only ask for the 
            //day first and then the course
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
          const day = getFactArgument(facts, "booking_day");
          const course = getFactArgument(facts, "booking_course");
          if (course == "LT2319") {
            if (day == "friday") {
            return { predicate: "booking_room", argument: "G212" };
            }
            if (day == "thursday") {
            return { predicate: "booking_room", argument: "J440" };
            }
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
      silence_count: 0
    },
    shared: { lu: undefined, qud: [], com: [] },
  };
};
