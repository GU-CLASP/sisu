import { Question, DMContext, InformationState } from "./types";

/** TODO need something better... */
function domainRelevant(answer: string, question: Question): boolean {
  if (
    question === ((x: string) => `favorite_food ${x}`) &&
    answer === "pizza"
  ) {
    return true;
  }
  return false;
}

type Rules = {
  [index: string]: (context: DMContext) => {
    preconditions: boolean;
    effects: InformationState;
  };
};

export const rules: Rules = {
  clear_agenda: (context) => {
    const newIS = {
      ...context.is,
      private: { ...context.is.private, agenda: [] },
    };
    console.debug(`[ISU clear_agenda]`, newIS);
    return {
      preconditions: true,
      effects: newIS,
    };
  },

  /**
   * Grounding
   */
  get_latest_move: (context) => {
    const newIS = {
      ...context.is,
      shared: {
        ...context.is.shared,
        lu: {
          move: context.latest_move!,
          speaker: context.latest_speaker!,
        },
      },
    };
    console.debug(`[ISU get_latest_move]`, newIS);
    return {
      preconditions: true,
      effects: newIS,
    };
  },

  /**
   * Integrate
   */
  /** rule 2.2 */
  integrate_sys_ask: (context) => {
    if (
      context.is.shared.lu!.speaker === "sys" &&
      context.is.shared.lu!.move.type === "ask"
    ) {
      const newIS = {
        ...context.is,
        shared: {
          ...context.is.shared,
          qud: [
            context.is.shared.lu!.move.content as Question,
            ...context.is.shared.qud,
          ],
        },
      };
      console.debug(`[ISU integrate_sys_ask]`, newIS);
      return {
        preconditions: true,
        effects: newIS,
      };
    }
    return {
      preconditions: false,
      effects: context.is,
    };
  },

  /** rule 2.3 */
  integrate_usr_ask: (context) => {
    if (
      context.is.shared.lu!.speaker === "usr" &&
      context.is.shared.lu!.move.type === "ask"
    ) {
      const newIS = {
        ...context.is,
        shared: {
          ...context.is.shared,
          qud: [
            context.is.shared.lu!.move.content as Question,
            ...context.is.shared.qud,
          ],
        },
      };
      console.debug(`[ISU integrate_usr_ask]`, newIS);
      return {
        preconditions: true,
        effects: newIS,
      };
    }
    return {
      preconditions: false,
      effects: context.is,
    };
  },

  /** rule 2.4 */
  integrate_answer: (context) => {
    const q = context.is.shared.qud[0];
    const a = context.is.shared.lu?.move.content as string;
    if (context.is.shared.lu?.move.type === "answer" && domainRelevant(a, q)) {
      const newIS = {
        ...context.is,
        shared: {
          ...context.is.shared,
          com: [q(a), ...context.is.shared.com],
        },
      };
      console.debug(`[ISU integrate_answer]`, newIS);
      return {
        preconditions: false,
        effects: context.is,
      };
    }
    return {
      preconditions: false,
      effects: context.is,
    };
  },

  /** rule 2.6 */
  integrate_greet: (context) => {
    if (context.is.shared.lu!.move.type === "greet") {
      const newIS = {
        ...context.is,
      };
      console.debug(`[ISU integrate_greet]`, newIS);
      return {
        preconditions: true,
        effects: newIS,
      };
    }
    return {
      preconditions: false,
      effects: context.is,
    };
  },
};

//   resolve_top_qud: (c) => {
//     if (c.is.shared.lu) {
//       if (c.is.shared.lu.move.type === "answer" && c.is.shared.qud[0]) {
//         let q = c.is.shared.qud[0];
//         let r = c.is.shared.lu.move.content as string;
//         return {
//           guard: true,
//           effects: assign(({ context }: { context: DMContext }) => {
//             const newIS = {
//               ...context.is,
//               shared: {
//                 ...context.is.shared,
//                 com: [q(r), ...context.is.shared.com],
//               },
//             };
//             console.debug("[ISU resolve_top_qud]", newIS);
//             return { is: newIS };
//           }),
//         };
//       }
//     }
//     return { guard: false, effects: undefined };
//   },
// };
