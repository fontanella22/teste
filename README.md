# Sítio Três Irmãos

Protótipo navegável de gestão veterinária e controle de rebanho, em português, adaptado a celular e computador. Node.js 20 ou superior; sem dependências de instalação.

```sh
cd /workspace/teste
npm start
```

Servidor na porta 3000 (configurável com `PORT`). Para validar: `npm test`.

## Telas e fluxos

- **Visão geral:** tamanho do rebanho, animais em lactação, leite registrado hoje, alertas de vacinas, carências e partos previstos, distribuição por localização.
- **Meu rebanho:** cadastro individual, busca por nome/brinco/raça, filtro de localização e ficha com edição e histórico.
- **Saúde e sanidade:** aplicações e próximas vacinas; tratamentos e vermifugações, responsável, dose/via em observações e carências separadas de leite e carne.
- **Produção e reprodução:** registros de leite por animal e data, indicação de leite sob carência, inseminação, cobertura, parto, início de lactação e secagem. Os dois últimos eventos atualizam a categoria do animal.
- **Minha propriedade:** proprietário, contato, nome, município, área e observações; exportação JSON de todos os registros.

Os dados demonstrativos são fictícios. A primeira abertura gera exemplos com datas próximas ao dia atual. Os registros são mantidos em `localStorage` por navegador/origem. A exportação é uma cópia JSON; restauração/importação ainda não foi implementada.

## Banco de dados

`database/schema.sql` é um esquema SQLite validado, destinado a uma futura API. Não é conectado ao protótipo. Relações: proprietário → propriedades → animais → vacinas, tratamentos, registros de leite e eventos reprodutivos. Contém chaves estrangeiras, brinco único por propriedade, restrições e índices; a view `treatment_withdrawals` calcula as datas de fim de carência.

## Regras e limites

Vacinas atrasadas ou previstas nos próximos 7 dias aparecem no painel; partos previstos aparecem a partir de 14 dias antes. Datas passadas de parto continuam como pendência até serem revisadas; registrar um parto não encerra automaticamente a previsão anterior. Os lembretes são internos, recalculados ao navegar/reabrir; não há push, SMS ou e-mail.

A carência é calculada em dias após a última aplicação, bloqueando inclusive a data final; a liberação é no dia seguinte. O cálculo diário não substitui carência em horas ou a orientação veterinária. A produção exibida é o volume bruto registrado, sem descontar o leite sob carência. Não há recomendação de vacinas, doses ou medicamentos.

Este é um código inicial, sem backend, autenticação, controle de acesso, sincronização entre dispositivos ou backup automático. Não utilizar como único registro operacional. As fontes externas são opcionais: sem acesso, a interface usa fontes locais. Antes de produção, implementar API com validação no servidor, autenticação, backup, auditoria, restauração e política de dados.
