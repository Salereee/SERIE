import { useNavigate } from 'react-router-dom';
import type { Program } from '../../db/schema';
import { useFeedback } from '../../ui/feedback';
import { getActiveSession, startSession } from './actions';

/** Empieza una sesión, o avisa si ya hay una abierta (solo puede haber una a la vez). */
export function useStartSession() {
  const navigate = useNavigate();
  const { confirm } = useFeedback();
  return async (opts: { program?: Program; dayId?: string } = {}) => {
    const active = await getActiveSession();
    if (active) {
      const ok = await confirm({
        title: 'Ya tienes una sesión en curso',
        body: `“${active.dayName}” sigue abierta. Termínala o descártala antes de empezar otra.`,
        confirmLabel: 'Ir a la sesión',
      });
      if (ok) navigate('/sesion');
      return;
    }
    await startSession(opts);
    navigate('/sesion');
  };
}
