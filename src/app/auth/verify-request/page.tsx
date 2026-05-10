export default function VerifyRequest() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground">
          A sign-in link has been sent to your email address.
        </p>
        <p className="text-sm text-muted-foreground">
          You can close this tab.
        </p>
      </div>
    </div>
  );
}
