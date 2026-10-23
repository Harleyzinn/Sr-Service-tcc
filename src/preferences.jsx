import { usePreferences } from "./theme";
import { ErrorBox, PageHeading, Icon } from "./ui";
export function Settings() {
  const { preferences, save, busy, error } = usePreferences();
  return (
    <>
      <PageHeading
        eyebrow="DO SEU JEITO"
        title="Preferências"
        description="Personalize a aparência e os blocos do painel financeiro."
      />
      <section className="panel settings-panel">
        <ErrorBox>{error}</ErrorBox>
        <h2>Aparência</h2>
        <div className="theme-options">
          {[
            ["light", "Sun", "Claro"],
            ["dark", "Moon", "Escuro"],
            ["system", "Settings2", "Usar sistema"],
          ].map(([value, icon, label]) => (
            <button
              key={value}
              className={preferences.theme === value ? "selected" : ""}
              disabled={busy}
              aria-pressed={preferences.theme === value}
              onClick={() => save({ ...preferences, theme: value })}
            >
              <Icon name={icon} size={23} />
              {label}
            </button>
          ))}
        </div>
        <h2>Widgets do financeiro</h2>
        {[
          ["chart", "Evolução mensal"],
          ["alerts", "Alertas calculados"],
          ["goals", "Progresso das metas"],
        ].map(([id, label]) => (
          <label className="checkbox" key={id}>
            <input
              type="checkbox"
              disabled={busy}
              checked={preferences.widgets.includes(id)}
              onChange={(e) =>
                save({
                  ...preferences,
                  widgets: e.target.checked
                    ? [...preferences.widgets, id]
                    : preferences.widgets.filter((w) => w !== id),
                })
              }
            />
            {label}
          </label>
        ))}
        <p>
          As preferências de uma conta real são salvas no Firestore e carregadas
          nos demais dispositivos ao acessar o portal. Nenhuma informação
          financeira é compartilhada com outros usuários.
        </p>
      </section>
    </>
  );
}
