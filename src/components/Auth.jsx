import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-black border-2 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
                <CardHeader className="bg-white text-black p-6 border-b-2 border-white">
                    <CardTitle className="text-3xl font-black tracking-tighter text-center">
                        {isSignUp ? 'CREATE ACCOUNT' : 'LOGIN'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 text-white">
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-2 text-gray-400">EMAIL</label>
                            <Input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-black border-white text-white"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 text-gray-400">PASSWORD</label>
                            <Input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-black border-white text-white"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="p-3 border-2 border-red-500 bg-red-900/20 text-red-500 text-sm font-bold">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="p-3 border-2 border-green-500 bg-green-900/20 text-green-500 text-sm font-bold">
                                {message}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black hover:bg-gray-200 border-white h-12 text-lg font-black"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'SIGN UP' : 'ENTER')}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm text-gray-400 hover:text-white underline font-medium"
                        >
                            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
