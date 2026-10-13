# Ativar o acesso protegido

A chave de `public/config.js` é publicável. Nunca coloque senha do banco, chave secret ou service_role no código, no GitHub ou no navegador. O script só se aplica a este novo projeto; não altera tabelas legadas de outros aplicativos.

1. No Supabase abra **SQL Editor → New query**, cole todo o conteúdo de `database/supabase.sql` e execute **Run**. É possível reexecutar sem apagar os registros existentes.
2. Em **Authentication → Providers / Sign In → Email**, habilite e-mail/senha. Em **Authentication → Settings / Sign In and Sign Up**, desative **Allow new users to sign up**. Ative confirmação de e-mail e use senha mínima de 12 caracteres. Mesmo se cadastro público for habilitado por engano, as políticas negam dados a contas sem associação à equipe.
3. Em **Authentication → URL Configuration**, configure **Site URL** como `https://fontanella22.github.io/teste/`. Adicione às **Redirect URLs** os dois endereços exatos `https://fontanella22.github.io/teste/index.html` e `https://fontanella22.github.io/teste/public/index.html`. Os dois caminhos cobrem publicação pela main e pela gh-pages. Convites e recuperação de senha dependem desses endereços. Configure SMTP próprio se precisar superar os limites do serviço de e-mail de demonstração do Supabase.
4. Em **Authentication → Users → Add user**, use **Create user** para sua própria conta ou **Invite user** para receber um convite. Defina sua senha no painel ou no link de convite; não compartilhe a senha. A criação manual permite configurar a primeira conta mesmo com cadastro público desativado. Evite senhas escolhidas para outras pessoas; use convites para a equipe.
5. No SQL Editor execute `database/bootstrap-admin.sql` depois de substituir `SEU_EMAIL` pelo e-mail da sua conta. Esse script concede acesso administrativo apenas à conta especificada. Ele não deve ser exposto como RPC nem executado no navegador.
6. Abra o aplicativo e entre. Na primeira utilização o banco está vazio. Em **Minha propriedade**, o administrador pode importar a cópia antiga salva nesse navegador. Confira se a cópia contém registros reais ou dados fictícios antes de confirmar. Não existe importação automática. O importador não sobrescreve um banco já inicializado.
7. Para outras pessoas, envie convites pelo painel Supabase. Em **Minha propriedade → Gerenciar equipe**, autorize cada conta: Administrador, Equipe (edição) ou Somente consulta. Contas sem autorização não podem acessar os registros. É possível revogar acesso por esse mesmo painel. O último administrador não pode ser removido pela aplicação.

## Verificação obrigatória no projeto real

- Sem login: apenas a tela de entrada; nenhum dado privado retornado pela API.
- Conta autenticada fora da equipe: acesso negado.
- Consulta: pode ler, não pode gravar nem mudar permissões (inclusive por chamada direta à API).
- Equipe: pode registrar dados, não pode autorizar usuários.
- Administrador: pode gerenciar contas já criadas/convidadas.
- Logout limpa a interface e os registros em memória; testar também após sessão expirada.
- Dois dispositivos: salvar em um e clicar **Atualizar dados** no outro. Versão antiga é rejeitada; atualize antes de repetir a edição.
- Convite e recuperação: definir senha pelo link enviado, com as URLs autorizadas.

Os testes locais executam as políticas em PostgreSQL (PGlite), mas não substituem a instalação e a verificação no projeto Supabase real. RLS e RPC devem permanecer habilitados. Não desative RLS para corrigir erro de acesso.

## Dados e limites

O banco guarda um documento JSON versionado por sítio (projeto inicial de uma propriedade). Os usuários autorizados compartilham todos os registros dessa propriedade. Não há isolamento entre várias propriedades, notificações em tempo real, log detalhado de auditoria ou restauração automática; backups do banco devem ser configurados conforme o plano. A versão evita sobrescrever silenciosamente edições concorrentes; não mescla alterações.

Dados antigos permanecem sob a chave `tres-irmaos-v1` no navegador, sem serem enviados para o banco até a confirmação de importação. Essa cópia local antiga não está protegida pelo login: depois de importar, conferir e guardar backup seguro, remova **apenas essa chave** do armazenamento do site nas ferramentas do navegador. Não limpe senhas/sessões ou dados de outros aplicativos inadvertidamente. Exportações JSON são cópias privadas fora da proteção RLS.

A sessão de login é mantida pelo SDK oficial do Supabase. Em aparelho compartilhado, use **Sair**. Código do site e chave publicável continuam públicos; a segurança dos registros depende das permissões do servidor, e não de ocultar arquivos do site. Revogar acesso impede novas leituras/gravações, mas não recupera cópias já vistas/exportadas por um usuário autorizado.
