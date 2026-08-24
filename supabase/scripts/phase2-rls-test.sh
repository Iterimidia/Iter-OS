#!/usr/bin/env bash
# Teste end-to-end da RLS da Fase 2 contra o Iter OS Staging.
#
# Prova, via PostgREST/GoTrue reais (exatamente o caminho que o app usaria),
# que as policies refletem o motor de permissões do frontend. Usa APENAS a
# chave publishable/anon (pública por design) + JWTs obtidos por login com
# credenciais fictícias de staging. NÃO usa service_role.
#
# Uso:
#   SUPABASE_URL=https://nbsezkskzizxtffhdeer.supabase.co \
#   ANON_KEY=sb_publishable_xxx \
#   STAGING_TEST_PASSWORD='...' \
#   bash supabase/scripts/phase2-rls-test.sh
#
# Todos os usuários e dados referenciados são fictícios (seed_* / *.invalid),
# exclusivos do projeto de staging.

set -uo pipefail

: "${SUPABASE_URL:?defina SUPABASE_URL}"
: "${ANON_KEY:?defina ANON_KEY (publishable/anon key do staging)}"
: "${STAGING_TEST_PASSWORD:?defina STAGING_TEST_PASSWORD (senha fictícia dos usuários de teste)}"

pass=0; fail=0
check() { # descrição, esperado, obtido
  if [ "$2" = "$3" ]; then echo "  PASS: $1 (=$3)"; pass=$((pass+1));
  else echo "  FAIL: $1 (esperado $2, obtido $3)"; fail=$((fail+1)); fi
}

login() { # email -> ecoa access_token (vazio se falhar)
  curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$STAGING_TEST_PASSWORD\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null
}

# conta linhas retornadas por um SELECT PostgREST (com ou sem JWT)
count() { # jwt(pode ser vazio), path_query
  local jwt="$1"; shift
  local auth=(); [ -n "$jwt" ] && auth=(-H "Authorization: Bearer $jwt")
  curl -s "$SUPABASE_URL/rest/v1/$1" -H "apikey: $ANON_KEY" "${auth[@]}" \
    | python3 -c "import sys,json
try:
  d=json.load(sys.stdin)
  print(len(d) if isinstance(d,list) else 'ERR')
except Exception:
  print('ERR')" 2>/dev/null
}

# status HTTP de uma escrita
write_status() { # jwt, method, path, body
  local jwt="$1" method="$2" path="$3" body="$4"
  curl -s -o /dev/null -w "%{http_code}" -X "$method" "$SUPABASE_URL/rest/v1/$path" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $jwt" \
    -H "Content-Type: application/json" -H "Prefer: return=minimal" -d "$body"
}

echo "== Login (GoTrue) =="
ADMIN=$(login seed.admin@teste.itermidia.invalid)
OPER=$(login seed.operacional@teste.itermidia.invalid)
FIN=$(login seed.financeiro@teste.itermidia.invalid)
INATIVO=$(login seed.inativo@teste.itermidia.invalid)
check "admin loga" "ok" "$([ -n "$ADMIN" ] && echo ok || echo no)"
check "operacional loga" "ok" "$([ -n "$OPER" ] && echo ok || echo no)"
check "financeiro loga" "ok" "$([ -n "$FIN" ] && echo ok || echo no)"
check "inativo loga no Auth (esperado: Auth não conhece 'active')" "ok" "$([ -n "$INATIVO" ] && echo ok || echo no)"

echo "== SELECT clients =="
check "não autenticado NÃO vê clients" "0" "$(count '' 'clients?select=id')"
check "admin vê 2 clients" "2" "$(count "$ADMIN" 'clients?select=id')"
check "operacional vê 1 client (só A)" "1" "$(count "$OPER" 'clients?select=id')"
check "operacional NÃO vê Cliente B" "0" "$(count "$OPER" 'clients?select=id&id=eq.seed_client_b')"
check "operacional vê Cliente A" "1" "$(count "$OPER" 'clients?select=id&id=eq.seed_client_a')"
check "inativo (sessão válida) NÃO vê clients" "0" "$(count "$INATIVO" 'clients?select=id')"

echo "== SELECT financial_entries (ver_financeiro) =="
check "admin vê financeiro (2)" "2" "$(count "$ADMIN" 'financial_entries?select=id')"
check "financeiro vê financeiro (2)" "2" "$(count "$FIN" 'financial_entries?select=id')"
check "operacional SEM ver_financeiro NÃO vê financeiro" "0" "$(count "$OPER" 'financial_entries?select=id')"
check "inativo NÃO vê financeiro" "0" "$(count "$INATIVO" 'financial_entries?select=id')"

echo "== SELECT tabelas ligadas a cliente (escopo) =="
check "operacional vê delivery_units do Cliente A (3)" "3" "$(count "$OPER" 'delivery_units?select=id')"
check "operacional vê content_items do Cliente A (1)" "1" "$(count "$OPER" 'content_items?select=id')"

echo "== Escrita: INSERT/UPDATE/DELETE (permitido x negado) =="
# operacional TEM 'criar' e acesso ao Cliente A -> INSERT task no A deve passar (201)
check "operacional INSERT task no Cliente A (201)" "201" \
  "$(write_status "$OPER" POST 'tasks' '{"id":"seed_test_task_oper_a","title":"t","responsible_id":"seed_operacional_restrito","status":"a_fazer","area":"operacional","client_id":"seed_client_a"}')"
# operacional INSERT task no Cliente B -> negado pela WITH CHECK (403)
check "operacional INSERT task no Cliente B (403)" "403" \
  "$(write_status "$OPER" POST 'tasks' '{"id":"seed_test_task_oper_b","title":"t","responsible_id":"seed_operacional_restrito","status":"a_fazer","area":"operacional","client_id":"seed_client_b"}')"
# operacional NÃO tem 'excluir' -> DELETE deve ser negado (0 linhas afetadas -> 204 mas nada apagado; checamos contagem)
oper_del=$(write_status "$OPER" DELETE 'tasks?id=eq.seed_test_task_oper_a' '')
still=$(count "$ADMIN" 'tasks?select=id&id=eq.seed_test_task_oper_a')
check "operacional SEM 'excluir' não apaga a task (linha permanece)" "1" "$still"
# admin limpa a task de teste
write_status "$ADMIN" DELETE 'tasks?id=eq.seed_test_task_oper_a' '' >/dev/null
check "admin apaga a task de teste (removida)" "0" "$(count "$ADMIN" 'tasks?select=id&id=eq.seed_test_task_oper_a')"
# operacional sem ver_financeiro -> INSERT em financial_entries negado (403)
check "operacional INSERT financial_entries (403, sem ver_financeiro)" "403" \
  "$(write_status "$OPER" POST 'financial_entries' '{"id":"seed_test_fin_x","type":"receita","description":"x","amount":1,"due_date":"2026-09-01","status":"pendente"}')"
# financeiro COM ver_financeiro+criar -> INSERT financial_entries passa (201), depois admin limpa
check "financeiro INSERT financial_entries (201)" "201" \
  "$(write_status "$FIN" POST 'financial_entries' '{"id":"seed_test_fin_ok","type":"receita","description":"x","amount":1,"due_date":"2026-09-01","status":"pendente"}')"
write_status "$ADMIN" DELETE 'financial_entries?id=eq.seed_test_fin_ok' '' >/dev/null

echo
echo "== RESULTADO: $pass PASS / $fail FAIL =="
[ "$fail" -eq 0 ]
