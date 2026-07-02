export type SpecSection ={
    id:string;
    label:string;
    description:string;
};

export const SPEC_SECTIONS: readonly SpecSection[] = [
    
    {
    id: "problem-goal", 
    label: "Problem and Goal",
    description: "Describe the problem statement and the desired outcome or goal of the problem"
    },
    {
    id: "core-features",
    label: "Core Features",
    description: "Core features of the project that are essential to achieve the goal."
    },
    {
    id: "scopes-n-non-goals",
    label: "Scopes and Non-goals",
    description: "Define the scope of the project and explicitly state what is not included in the project."
    },
    {
    id: "user-flow",
    label: "User Flow",
    description: "Describes the user flow and the steps user will take to build or interact with the project."
    },
    {
    id: "constraints-and-assumptions",
    label: "Constraints and Assumptions",
    description: "Constraints or assumptions that are relevant to the project, such as technical limitations, resource availability, or dependencies on other projects."
    },
    {
    id: "success-criteria",
    label: "Success Criteria",
    description: "Criteria that will be used to evaluate the success of the project, such as performance metrics or end-user satisfaction."
    },
    {
    id: "open-questions",
    label: "Open Questions",
    description: "Any open questions or uncertainties that need to be addressed during the project."
    },

]as const;
