import {
  Question,
  TotalInformationState,
  InformationState,
  Move,
  DomainRelation,
} from "./types";

type Rules = {
  [index: string]: (context: TotalInformationState) => {
    preconditions: boolean;
    effects: InformationState;
  };
};

function relevant(x: DomainRelation): boolean {
  return ["relevant", "resolves"].includes(x.type);
}
function resolves(x: DomainRelation): boolean {
  return "resolves" === x.type;
}

const plans = {
  create_appointment: [
    {
      type: "findout",
      content: {
        type: "wh_question",
        predicate: "meeting_person",
      },
    },
  ],
};

export const rules: Rules = {
  clear_agenda: ({ is }) => {
    const newIS = {
      ...is,
      private: { ...is.private, agenda: [] },
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
  /** rule 5.1 */
  integrate_usr_request: ({ is }) => {
    if (
      is.shared.lu!.speaker === "usr" &&
      is.shared.lu!.move.type === "request"
    ) {
      let action = is.shared.lu!.move.content;
      if (action in plans) {
        let plan = plans[action];
        const newIS = {
          ...is,
          private: {
            ...is.private,
            agenda: plan.concat(is.private.agenda),
          },
        };
        console.debug(`[ISU integrate_usr_request]`, newIS);
        return {
          preconditions: true,
          effects: newIS,
        };
      }
    }
    return {
      preconditions: false,
      effects: is,
    };
  },

  /** rule 2.2 */
  integrate_sys_ask: ({ is }) => {
    if (is.shared.lu!.speaker === "sys" && is.shared.lu!.move.type === "ask") {
      const newIS = {
        ...is,
        shared: {
          ...is.shared,
          qud: [is.shared.lu!.move.content as Question, ...is.shared.qud],
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
      effects: is,
    };
  },

  /** rule 2.3 */
  integrate_usr_ask: ({ is }) => {
    if (is.shared.lu!.speaker === "usr" && is.shared.lu!.move.type === "ask") {
      const newIS = {
        ...is,
        shared: {
          ...is.shared,
          qud: [is.shared.lu!.move.content as Question, ...is.shared.qud],
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
      effects: is,
    };
  },

  /** rule 2.4 */
  integrate_answer: ({ is }) => {
    const topQUD = is.shared.qud[0];
    const a = is.shared.lu!.move.content as string;
    if (topQUD && is.shared.lu!.move.type === "answer") {
      if (
        !!is.domain
          .filter((r) => relevant(r))
          .filter((r) => r.content[1].toString() === topQUD.toString())
          .filter((r) => r.content[0] === a)[0]
      ) {
        // TODO (?) should combined proposition be added to domain?
        const newIS = {
          ...is,
          shared: {
            ...is.shared,
            com: [topQUD(a), ...is.shared.com],
          },
        };
        console.debug(`[ISU integrate_usr_ask]`, newIS);
        return {
          preconditions: true,
          effects: newIS,
        };
      }
    }
    return {
      preconditions: false,
      effects: is,
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

  /** TODO rule 2.7 integrate_usr_quit */

  /** TODO rule 2.8 integrate_sys_quit */

  /**
   * DowndateQUD
   */
  /** rule 2.5 */
  downdate_qud: ({ is }) => {
    const q = is.shared.qud[0];
    for (const p of is.shared.com) {
      if (
        is.domain
          .filter((r) => resolves(r))
          .filter((r) => r.content[0] === p)
          .some((r) => r.content[0].toString() === q.toString())
      ) {
        const newIS = {
          ...is,
          shared: {
            ...is.shared,
            qud: [...is.shared.qud.slice(1)],
          },
        };
        console.debug(`[ISU downdate_qud]`, newIS);
        return {
          preconditions: false,
          effects: newIS,
        };
      }
    }
    return {
      preconditions: false,
      effects: is,
    };
  },

  /**
   * ExecPlan
   */
  /** rule 2.9: for now, we assume that there is always a BEL for every
   * question in the domain
   */
  find_plan: (context) => {
    return {
      preconditions: false,
      effects: context.is,
    };
  },

  /** TODO rule 2.10 remove_findout */

  /** TODO rule 2.11 exec_consult_db */

  /**
   * Select
   */
  /** rule 2.12 */
  select_from_plan: ({ is }) => {
    if (is.private.agenda.length === 0 && !!is.private.plan[0]) {
      const action = is.private.plan[0];
      const newIS = {
        ...is,
        private: {
          ...is.private,
          agenda: [action, ...is.private.agenda],
        },
      };
      console.debug(`[ISU select_from_plan]`, newIS);
      return {
        preconditions: true,
        effects: newIS,
      };
    }
    return {
      preconditions: false,
      effects: is,
    };
  },

  /** rule 2.13 */
  select_ask: ({ is }) => {
    let newIS = is;
    if (
      is.private.agenda[0] &&
      ["findout", "raise"].includes(is.private.agenda[0].type)
    ) {
      const q = is.private.agenda[0].content;
      if (is.private.plan[0] && is.private.plan[0].type === "raise") {
        newIS = {
          ...is,
          next_move: { type: "ask", content: q },
          private: { ...is.private, plan: [...is.private.plan.slice(1)] },
        };
        console.debug(`[ISU select_ask]`, newIS);
      } else {
        newIS = {
          ...is,
          next_move: { type: "ask", content: q },
        };
        console.debug(`[ISU select_ask]`, newIS);
      }
      return {
        preconditions: true,
        effects: newIS,
      };
    }
    return {
      preconditions: false,
      effects: is,
    };
  },

  /** rule 2.14 */
  select_respond: ({ is }) => {
    if (
      is.private.agenda.length === 0 &&
      is.private.plan.length === 0 &&
      is.shared.qud[0]
    ) {
      const topQUD = is.shared.qud[0];
      for (const rel of is.domain
        .filter((r) => relevant(r))
        .filter((r) => r.content[1].toString() === topQUD.toString())) {
        const p = rel.content[0];
        if (is.private.bel.includes(p) && !is.shared.com.includes(p)) {
          const respondMove: Move = { type: "respond", content: topQUD };
          const newIS = {
            ...is,
            private: {
              ...is.private,
              agenda: [respondMove, ...is.private.agenda],
            },
          };
          console.debug(`[ISU select_respond]`, newIS);
          return {
            preconditions: true,
            effects: newIS,
          };
        }
      }
    }
    return {
      preconditions: false,
      effects: is,
    };
  },

  select_answer: ({ is }) => {
    if (is.private.agenda[0] && is.private.agenda[0].type === "respond") {
      const question = is.private.agenda[0].content as Question;
      for (const rel of is.domain
        .filter((r) => relevant(r))
        .filter((r) => r.content[1].toString() === question.toString())) {
        const p = rel.content[0];
        if (is.private.bel.includes(p) && !is.shared.com.includes(p)) {
          const answerMove: Move = { type: "answer", content: p };
          const newIS = { ...is, next_move: answerMove };
          console.debug(`[ISU select_answer]`, newIS);
          return {
            preconditions: true,
            effects: newIS,
          };
        }
      }
    }
    return {
      preconditions: false,
      effects: is,
    };
  },

  /** only for greet for now */
  select_other: ({ is }) => {
    if (is.private.agenda[0] && is.private.agenda[0].type === "greet") {
      const newIS = { ...is, next_move: is.private.agenda[0] };
      console.debug(`[ISU select_answer]`, newIS);
      return {
        preconditions: true,
        effects: newIS,
      };
    }
    return {
      preconditions: false,
      effects: is,
    };
  },
};
