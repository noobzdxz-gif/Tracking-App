import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage("Check your email for the confirmation link!");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight text-white text-center">
                        {isSignUp ? 'Create an account' : 'Welcome back'}
                    </CardTitle>
                    <CardDescription className="text-center text-zinc-400">
                        {isSignUp ? 'Enter your email below to create your account' : 'Enter your email below to login to your account'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="grid gap-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-200">Email</label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-zinc-950/50 border-zinc-700 focus-visible:ring-zinc-600"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-200">Password</label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-zinc-950/50 border-zinc-700 focus-visible:ring-zinc-600"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-md bg-red-900/20 border border-red-900/50 text-red-500 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="p-3 rounded-md bg-green-900/20 border border-green-900/50 text-green-500 text-sm font-medium">
                                {message}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black hover:bg-zinc-200 font-bold"
                        >
                            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm text-zinc-400 hover:text-white underline underline-offset-4"
                        >
                            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
