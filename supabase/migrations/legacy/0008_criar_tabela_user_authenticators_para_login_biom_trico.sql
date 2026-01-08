-- Criar tabela para armazenar as credenciais WebAuthn (Passkeys)
CREATE TABLE IF NOT EXISTS public.user_authenticators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key JSONB NOT NULL,
    counter BIGINT DEFAULT 0 NOT NULL,
    transports JSONB,
    friendly_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar segurança a nível de linha (RLS)
ALTER TABLE public.user_authenticators ENABLE ROW LEVEL SECURITY;

-- Política 1: Usuários podem ver apenas seus próprios dispositivos
CREATE POLICY "Users can view their own authenticators" 
ON public.user_authenticators 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Política 2: Usuários podem remover seus próprios dispositivos
CREATE POLICY "Users can delete their own authenticators" 
ON public.user_authenticators 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Nota: A inserção (INSERT) e atualização (UPDATE) são feitas pela Edge Function
-- com permissões de administrador, então não precisam de políticas públicas.