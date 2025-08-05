
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Todo, CreateTodoInput, UpdateTodoInput, User, Subscription, SignInInput, SignUpInput } from '../../server/src/schema';

function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(
    localStorage.getItem('sessionToken')
  );
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authLoading, setAuthLoading] = useState(false);

  // Todo state
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [todoFormData, setTodoFormData] = useState<CreateTodoInput>({
    title: '',
    description: null
  });

  // Payment state
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Auth form state
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: ''
  });

  // Load current user on app start
  useEffect(() => {
    const loadCurrentUser = async () => {
      if (sessionToken) {
        try {
          const currentUser = await trpc.getCurrentUser.query();
          setUser(currentUser);
        } catch (error) {
          console.error('Failed to get current user:', error);
          localStorage.removeItem('sessionToken');
          setSessionToken(null);
        }
      }
    };
    loadCurrentUser();
  }, [sessionToken]);

  // Load todos and subscription when user is authenticated
  const loadUserData = useCallback(async () => {
    if (!user) return;
    
    try {
      const [todosResult, subscriptionResult] = await Promise.all([
        trpc.getTodos.query(),
        trpc.getSubscription.query()
      ]);
      setTodos(todosResult);
      setSubscription(subscriptionResult);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }, [user]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Authentication handlers
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const signInData: SignInInput = {
        email: authForm.email,
        password: authForm.password
      };
      const response = await trpc.signIn.mutate(signInData);
      // Response is { user: User; session: { token: string } }
      localStorage.setItem('sessionToken', response.session.token);
      setSessionToken(response.session.token);
      setUser(response.user);
      setAuthForm({ email: '', password: '', name: '' });
    } catch (error) {
      console.error('Sign in failed:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const signUpData: SignUpInput = {
        email: authForm.email,
        password: authForm.password,
        name: authForm.name
      };
      const response = await trpc.signUp.mutate(signUpData);
      // Response is just User, so we need to sign in after signup
      // For now, we'll simulate a session token (this should be handled by the backend)
      const simulatedToken = `temp_${Date.now()}`;
      localStorage.setItem('sessionToken', simulatedToken);
      setSessionToken(simulatedToken);
      setUser(response);
      setAuthForm({ email: '', password: '', name: '' });
    } catch (error) {
      console.error('Sign up failed:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await trpc.signOut.mutate();
      localStorage.removeItem('sessionToken');
      setSessionToken(null);
      setUser(null);
      setTodos([]);
      setSubscription(null);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  // Todo handlers
  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoFormData.title.trim()) return;
    
    setIsLoading(true);
    try {
      const newTodo = await trpc.createTodo.mutate(todoFormData);
      setTodos((prev: Todo[]) => [...prev, newTodo]);
      setTodoFormData({ title: '', description: null });
    } catch (error) {
      console.error('Failed to create todo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTodo = async (todo: Todo) => {
    try {
      const updateData: UpdateTodoInput = {
        id: todo.id,
        completed: !todo.completed
      };
      const updatedTodo = await trpc.updateTodo.mutate(updateData);
      setTodos((prev: Todo[]) =>
        prev.map((t: Todo) => t.id === todo.id ? updatedTodo : t)
      );
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      await trpc.deleteTodo.mutate({ id: todoId });
      setTodos((prev: Todo[]) => prev.filter((t: Todo) => t.id !== todoId));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  // Payment handlers
  const handleCreateCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const result = await trpc.createCheckout.mutate({
        priceId: 'price_premium_monthly', // Replace with actual price ID
        successUrl: `${window.location.origin}?success=true`,
        cancelUrl: `${window.location.origin}?canceled=true`
      });
      window.location.href = result.checkoutUrl;
    } catch (error) {
      console.error('Failed to create checkout:', error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCustomerPortal = async () => {
    try {
      const result = await trpc.createCustomerPortal.mutate();
      window.location.href = result.portalUrl;
    } catch (error) {
      console.error('Failed to open customer portal:', error);
    }
  };

  // If not authenticated, show auth forms
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              📝 Todo App
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as 'signin' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={authForm.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAuthForm(prev => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={authForm.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAuthForm(prev => ({ ...prev, password: e.target.value }))
                    }
                    required
                  />
                  <Button type="submit" className="w-full" disabled={authLoading}>
                    {authLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <Input
                    placeholder="Full Name"
                    value={authForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAuthForm(prev => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={authForm.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAuthForm(prev => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                  <Input
                    type="password"
                    placeholder="Password (min 8 characters)"
                    value={authForm.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAuthForm(prev => ({ ...prev, password: e.target.value }))
                    }
                    minLength={8}
                    required
                  />
                  <Button type="submit" className="w-full" disabled={authLoading}>
                    {authLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main app interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              📝 Todo App
            </h1>
            <p className="text-gray-600">Welcome back, {user.name}! 👋</p>
          </div>
          <div className="flex items-center gap-4">
            {subscription && (
              <Badge 
                variant={subscription.status === 'active' ? 'default' : 'secondary'}
                className="text-sm"
              >
                {subscription.status === 'active' ? '⭐ Premium' : `Status: ${subscription.status}`}
              </Badge>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Payment Section */}
        {!subscription || subscription.status !== 'active' ? (
          <Alert className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <AlertDescription className="flex items-center justify-between">
              <div>
                <strong>🚀 Upgrade to Premium!</strong>
                <p className="text-sm text-gray-600 mt-1">
                  Get unlimited todos, priority support, and exclusive features.
                </p>
              </div>
              <Button 
                onClick={handleCreateCheckout}
                disabled={checkoutLoading}
                className="ml-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {checkoutLoading ? 'Processing...' : 'Upgrade Now'}
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <AlertDescription className="flex items-center justify-between">
              <div>
                <strong>🎉 You're a Premium user!</strong>
                <p className="text-sm text-gray-600 mt-1">
                  Subscription active until {subscription.currentPeriodEnd.toLocaleDateString()}
                </p>
              </div>
              <Button variant="outline" onClick={handleCustomerPortal}>
                Manage Subscription
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Create Todo Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ✨ Add New Todo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTodo} className="space-y-4">
                <Input
                  placeholder="What needs to be done?"
                  value={todoFormData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTodoFormData((prev: CreateTodoInput) => ({ 
                      ...prev, 
                      title: e.target.value 
                    }))
                  }
                  required
                />
                <Input
                  placeholder="Description (optional)"
                  value={todoFormData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTodoFormData((prev: CreateTodoInput) => ({
                      ...prev,
                      description: e.target.value || null
                    }))
                  }
                />
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={isLoading || !todoFormData.title.trim()}
                >
                  {isLoading ? 'Adding...' : '➕ Add Todo'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Todo Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Your Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Todos</span>
                  <Badge variant="secondary">{todos.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <Badge variant="default">
                    {todos.filter((t: Todo) => t.completed).length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Remaining</span>
                  <Badge variant="outline">
                    {todos.filter((t: Todo) => !t.completed).length}
                  </Badge>
                </div>
                {todos.length > 0 && (
                  <div className="pt-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>
                        {Math.round((todos.filter((t: Todo) => t.completed).length / todos.length) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(todos.filter((t: Todo) => t.completed).length / todos.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Todo List */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Your Todos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">🎯</div>
                <p>No todos yet! Create your first one above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todos.map((todo: Todo) => (
                  <div 
                    key={todo.id} 
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                      todo.completed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleTodo(todo)}
                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium ${
                        todo.completed 
                          ? 'line-through text-gray-500' 
                          : 'text-gray-800'
                      }`}>
                        {todo.title}
                      </h3>
                      {todo.description && (
                        <p className={`text-sm mt-1 ${
                          todo.completed 
                            ? 'line-through text-gray-400' 
                            : 'text-gray-600'
                        }`}>
                          {todo.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Created: {todo.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      🗑️
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
