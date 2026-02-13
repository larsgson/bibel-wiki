import useTranslation from "../../hooks/useTranslation";
import "./ListenChoose.css";

function ListenChoose({ layoutTheme }) {
  const { t } = useTranslation();

  return (
    <div className={`listen-choose${layoutTheme ? ` theme-${layoutTheme}` : ""}`}>
      <div className="listen-choose-placeholder">
        <p>{t("learnExercises.listenChoose") || "Listen & Choose"}</p>
        <p className="listen-choose-coming-soon">Coming soon</p>
      </div>
    </div>
  );
}

export default ListenChoose;
