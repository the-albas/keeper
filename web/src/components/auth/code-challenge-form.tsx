import { useEffect, useState } from "react";
import { RiRefreshLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type CodeChallengeFormProps = {
  verifyLabel: string;
  isVerifying: boolean;
  isResending: boolean;
  errorMessage?: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
};

export function CodeChallengeForm({
  verifyLabel,
  isVerifying,
  isResending,
  errorMessage,
  onVerify,
  onResend,
  onBack,
}: CodeChallengeFormProps) {
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!isVerifying) {
      return;
    }

    setCode((currentCode) => currentCode.trim());
  }, [isVerifying]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onVerify(code);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex justify-center py-6">
        <InputOTP
          maxLength={6}
          pattern="^[0-9]+$"
          inputMode="numeric"
          value={code}
          onChange={setCode}
          disabled={isVerifying}
          containerClassName="justify-center sm:justify-start"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full"
        disabled={isVerifying || code.length !== 6}
      >
        {isVerifying ? "Checking code..." : verifyLabel}
      </Button>

      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="justify-start"
          onClick={onBack}
        >
          Go back
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="justify-start gap-2"
          onClick={() => void onResend()}
          disabled={isResending}
        >
          <RiRefreshLine
            className={`size-4 ${isResending ? "animate-spin" : ""}`}
          />
          {isResending ? "Sending..." : "Resend code"}
        </Button>
      </div>
    </form>
  );
}
