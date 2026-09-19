import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <section className="grid min-h-full place-items-center px-4 py-10">
      <div className="flex justify-center">
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          forceRedirectUrl="/profile-name"
        />
      </div>
    </section>
  );
}
