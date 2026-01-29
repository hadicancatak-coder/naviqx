import { Check, X } from "lucide-react";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const requirements: PasswordRequirement[] = [
    { label: "At least 9 characters", met: password.length >= 9 },
    { label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
    { label: "One number (0-9)", met: /[0-9]/.test(password) },
    { label: "One special character (!@#$%^&*()_+-=[]{}|;:,.<>?)", met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];

  const metCount = requirements.filter(r => r.met).length;
  const strength = metCount === 0 ? 0 : metCount === 4 ? 100 : (metCount / 4) * 100;

  const getStrengthLabel = () => {
    if (metCount === 4) return "Strong";
    if (metCount >= 2) return "Medium";
    return "Weak";
  };

  const getStrengthColor = () => {
    if (metCount === 4) return "bg-success";
    if (metCount >= 2) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="space-y-sm">
      <div className="space-y-xs">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-xs text-body-sm">
            {req.met ? (
              <Check className="h-4 w-4 text-success flex-shrink-0" />
            ) : (
              <X className="h-4 w-4 text-destructive flex-shrink-0" />
            )}
            <span className={req.met ? "text-success-text" : "text-muted-foreground"}>
              {req.label}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-xs">
        <div className="flex items-center justify-between text-body-sm">
          <span className="text-muted-foreground">Password Strength:</span>
          <span className={`font-medium ${metCount === 4 ? 'text-success-text' : metCount >= 2 ? 'text-warning-text' : 'text-destructive-text'}`}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getStrengthColor()}`}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>
    </div>
  );
};
