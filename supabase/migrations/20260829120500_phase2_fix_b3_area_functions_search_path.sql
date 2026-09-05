-- Fecha o lint function_search_path_mutable introduzido pelas duas novas
-- funções da correção de B3 (iteros_task_area, iteros_calendar_area),
-- alinhando-as ao mesmo padrão de segurança já usado pelos demais helpers
-- iteros_* (search_path fixo e vazio). Nenhuma mudança de comportamento.
alter function public.iteros_task_area(text) set search_path = '';
alter function public.iteros_calendar_area(text) set search_path = '';
