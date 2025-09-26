import { InformationState } from "./types";
import {
  objectsEqual,
  WHQ,
  findout,
  consultDB,
  getFactArgument,
} from "./utils";

export const initialIS = (): InformationState => { //based on const we have the return
  const predicates: { [index: string]: string } = {
    // Mapping from predicate to sort
    favorite_food: "food",
    food_you_hate: "food",
    which_day: "day",
    booking_room: "room",
    booking_course: "course",
  };
  const individuals: { [index: string]: string } = { //based on individuals we have the return
    // Mapping from individual to sort
    pizza: "food",
    hotdog: "food",
    kebab: "food",
    friday: "day",
    tuesday: "day",
    G212: "room",
    J440: "room",
    LT2319: "course",
    "Dialogue Systems 2": "course",
  };
  return {
    domain: { //domain is the posisbilities that are available. All possible plans.
      predicates: predicates,
      individuals: individuals,
      plans: [
        {
          type: "issue",
          content: WHQ("booking_room"),
          plan: [
            findout(WHQ("which_day")),
            findout (WHQ("booking_course")),
            consultDB(WHQ("booking_room")),
          ],
        },
        {
        type: "issue",
         content: WHQ("which_course"),
         plan: [
          findout(WHQ("booking_course")),
            consultDB(WHQ("which_day")),
          ],
        },
      ],
    },
    database: {
      consultDB: (question, facts) => {
        if (objectsEqual(question, WHQ("booking_room"))) {
          const day = getFactArgument(facts, "which_day");
          const course = getFactArgument(facts, "booking_course"); // likely "LT2319"
     // Only answer if the course is Dialogue systems 2 (LT2319)
          if (!course || course.toLowerCase() !== "lt2319") return null;
 //facts mean answer to the question
          if (day?.toLowerCase() == "friday") {
            return { predicate: "booking_room", argument: "G212" };
          } else if (day?.toLowerCase() == "tuesday") {
            return { predicate: "booking_room", argument: "J440" };
          }
        }
        return null;
      },
    },
    next_moves: [],

    private: {
      plan: [], // Plans are domain-specific and high-level descriptions of how goals are achieved.
      agenda: [ // next action to be performed 
        {
          type: "greet",
          content: null,
        },
      ],
      bel: [{ predicate: "favorite_food", argument: "pizza" }], //things in your head, ex.: you know in your mind
    },
    shared: { 
      lu: undefined, // lu is the last utterance 
      qud: [],  // QUD
      com: [] //com is common ground
    },  
  };
};
