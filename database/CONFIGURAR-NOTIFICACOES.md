# Ativar resumo diário para a equipe

O código foi preparado, mas notificações reais só começam após estes passos no projeto Supabase. O horário é **7h da manhã em America/Sao_Paulo (Brasília)**. O resumo do aplicativo inclui pendências e datas de hoje até 7 dias à frente: vacinas individuais e por lote, partos previstos, início de tratamentos programados e fim da carência para abate. Um aviso genérico é enviado diariamente, inclusive quando não há eventos. Dados e nomes dos animais ficam disponíveis somente após login.

## 1. Instalar tabelas e permissões

No SQL Editor execute todo o conteúdo de `database/notifications.sql`. Este script complementa `database/supabase.sql`, sem apagar os registros do rebanho. Aparelhos são privados por conta; visitantes não podem listar assinaturas, e apenas o servidor pode acionar os envios. Toda conta autorizada (administrador, equipe ou consulta) pode ativar seu aparelho.

## 2. Preparar chaves e segredo

No aplicativo, entre como administrador e abra **Preparar envio → Gerar chaves neste aparelho**. Copie os valores diretamente para o Supabase. Não envie valores privados no chat e não os publique no GitHub. As chaves são geradas localmente por Web Crypto, ficam somente na janela aberta e não são enviadas automaticamente. Ao fechar, a janela limpa os valores; guarde-os de forma segura para completar a configuração. Não gere chaves novas quando o serviço já estiver funcionando: trocar VAPID exige registrar os aparelhos novamente.

Em **Edge Functions → Secrets**, crie:

- `VAPID_PUBLIC_KEY`: chave pública gerada.
- `VAPID_PRIVATE_KEY`: chave privada gerada.
- `PUSH_JOB_SECRET`: segredo aleatório gerado, com mais de 32 caracteres.
- `VAPID_SUBJECT`: opcional, URL de contato HTTPS ou `mailto:`; padrão é a URL do sítio.

As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas pelo runtime Supabase. Não copie service_role para o navegador ou o código público.

No **Vault** do Supabase, crie também um segredo chamado `push_daily_job_secret`, com o MESMO valor de `PUSH_JOB_SECRET`. O cron consulta o Vault; o valor não fica escrito no SQL da agenda. Se o Vault não estiver disponível, ative a integração/extensão Supabase Vault antes de prosseguir.

## 3. Publicar a função

No painel **Edge Functions**, crie uma função chamada **daily-digest** e cole o conteúdo completo de `supabase/functions/daily-digest/index.ts` (arquivo gerado com todas as funções locais já incluídas). As duas dependências `npm:` são resolvidas pelo runtime Deno. Configure a opção de verificação JWT do gateway como **desativada** para esta função: o cron usa segredo próprio, e o código valida obrigatoriamente JWT e associação à equipe para fornecer a chave pública. A ação de envio exige `PUSH_JOB_SECRET`; desativar a verificação do gateway não remove essas validações internas.

Alternativa com Supabase CLI, autenticado na sua conta:

```sh
supabase functions deploy daily-digest --project-ref ffzvurispepejyhcmztk --no-verify-jwt
```

O fonte mantido é `source.ts`; `npm run build` gera `index.ts`. O pacote web-push usa a compatibilidade Node do runtime Deno. A implantação e a entrega reais devem ser verificadas no projeto; testes locais usam substitutos de transporte e não enviam notificações a aparelhos reais.

## 4. Ativar horário automático

Depois da função e dos segredos, execute `database/notifications-cron.sql` no SQL Editor. O job é `sitio-daily-digest`, com chamada às 10h UTC (7h Brasília) e retentativas às 7h15/7h30 apenas para aparelhos ainda não confirmados pelo serviço de push. Entregas aceitas não são enviadas novamente no mesmo dia. O comando pode ser reexecutado para substituir o mesmo job.

O worker processa até 100 aparelhos por chamada, com no máximo 3 tentativas por aparelho/dia. Isso atende a equipe pequena do sítio; aumentar o número de aparelhos exige adaptar limites e fila. Se o processo parar após o provedor aceitar e antes de registrar a resposta, pode haver repetição de transporte; a tag diária e `renotify:false` substituem o mesmo aviso no aparelho em vez de pedir outro alerta sonoro. Não há garantia de entrega exatamente uma vez nem de exibição às 7h em ponto.

## 5. Registrar cada aparelho e verificar

Cada pessoa entra e toca em **Ativar notificações neste aparelho**. Ela precisa aceitar a permissão do sistema; não há seleção individual de assuntos. Toda a equipe recebe o mesmo tipo de resumo. Android: Chrome compatível. iPhone: iOS 16.4+ e PWA instalado na Tela de Início. No iPhone, o pedido de permissão deve ocorrer dentro do aplicativo instalado. Se bloqueado, liberar nas configurações do navegador/celular.

Confira no painel Supabase a execução do cron, a resposta HTTP de pg_net e os logs da função. `push_deliveries.status=sent` significa que o serviço de push aceitou, não que o usuário leu. Instalação, conectividade, economia de bateria, modo de foco e permissões podem atrasar ou impedir a exibição. Assinaturas expiradas (HTTP 404/410) são desativadas. Ao usar **Sair**, o aplicativo tenta remover a assinatura e cancelar a inscrição no aparelho; se estiver sem rede, o servidor pode manter a assinatura antiga, mas os avisos são genéricos. Usuários sem associação à equipe não entram em novos envios.

Para testar manualmente, use o teste da Edge Function com corpo `{"action":"dispatch"}` e o header `x-job-secret` preenchido DE FORMA PRIVADA no painel. Isso envia um resumo aos aparelhos elegíveis e conta como o aviso do dia; não faça sem querer notificar a equipe. Não coloque esse segredo em exemplos de navegador, logs ou chat. O evento de clique abre **Resumo diário**; login continua obrigatório. Se um formulário estiver aberto, ele é preservado e o usuário é orientado a concluí-lo antes de abrir o resumo.

Para suspender o envio, pause/remova `sitio-daily-digest` em Cron. Não desative RLS para corrigir problemas de acesso.
