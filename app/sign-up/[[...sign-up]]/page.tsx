import {SignUp} from "@clerk/nextjs";

export default function SignUpPage() {
return (
    <main className="grid min-h-screen place-items-center px-4 py-24">
        <div className="flex justify-center">
            <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" fallbackRedirectUrl="/"/>
        </div>
    </main>
);
}
