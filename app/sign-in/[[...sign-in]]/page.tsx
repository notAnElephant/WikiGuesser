import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-24">
      <section className="w-full max-w-md rounded-[32px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,251,245,0.98),rgba(255,247,238,0.92))] p-5 shadow-[0_24px_60px_rgba(53,36,22,0.12)] backdrop-blur-xl sm:p-7">
        <div className="mb-6">
          <p className="m-0 mb-3 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59]">Account access</p>
          <h1 className="m-0 font-serif-display text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-[#1f1b17]">
            Sign in to play.
          </h1>
          <p className="mb-0 mt-3 leading-7 text-[#6b6259]">
            Clerk handles the session. Once you are in, the game routes and round actions are tied to your account.
          </p>
        </div>
        <div className="flex justify-center">
          <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" fallbackRedirectUrl="/" />
        </div>
      </section>
    </main>
  );
}
