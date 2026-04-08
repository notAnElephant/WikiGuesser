import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-24">
        <div className="flex justify-center">
          <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" fallbackRedirectUrl="/" />
        </div>
    </main>
  );
}
