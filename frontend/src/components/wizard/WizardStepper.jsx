import { Stepper, Step, StepLabel } from "@mui/material";

export function WizardStepper({ steps, activeStep }) {
  return (
    <Stepper
      activeStep={activeStep}
      alternativeLabel
      sx={{
        "& .MuiStepIcon-root.Mui-completed": { color: "primary.main" },
        "& .MuiStepIcon-root.Mui-active": { color: "primary.main" },
        "& .MuiStepLabel-label.Mui-active": {
          color: "primary.main",
          fontWeight: 600,
        },
      }}
    >
      {steps.map((step, index) => (
        <Step key={index}>
          <StepLabel>{step.label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}