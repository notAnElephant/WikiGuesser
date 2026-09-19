import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <section className="grid min-h-full place-items-center px-4 py-10">
      <div className="flex justify-center">
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
        />
      </div>
    </section>
  );
}
