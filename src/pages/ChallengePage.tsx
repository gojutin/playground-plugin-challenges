// 228
import React from "react";
import { css } from "goober";
import {
  Layout,
  Button,
  Badge,
  Celebrate,
  Title,
  ErrorsList,
  Show,
  Hint
} from "../components";
import { usePlugin, File } from "../plugin";
import { minify } from "../utils";

const { useState, useEffect, useCallback } = React;

type Error = {
  type: "type" | "source";
  value: string;
};

type Status = "NEW" | "ERROR" | "ANSWERED" | "SOLUTION";

type Props = {
  currentItem: File;
  data: File[];
  onNext: () => void;
  onDone: () => void;
  currentIndex: number;
};
const ChallengePageComponent: React.FC<Props> = ({
  currentItem,
  currentIndex,
  data,
  onNext,
  onDone
}) => {
  const { setDebounce, setCode, code, sandbox, markers } = usePlugin();
  // sandbox.config.compilerOptions = {
  //   removeComments: true
  // };
  setDebounce(true);

  const [errors, setErrors] = useState([] as Error[]);
  const [showHint, setShowHint] = useState(false);
  // const [correctCount, setCorrectCount] = useState(0);
  const [status, setStatus] = useState<Status>("ERROR");

  useEffect(() => {
    if (status === "SOLUTION") return;
    if (markers.length) {
      setStatus("ERROR");
    }
  }, [markers, status]);

  useEffect(() => {
    if (status === "SOLUTION") return;
    if (errors.length) {
      setStatus("ERROR");
    }
  }, [errors, status]);

  const handleCheck = useCallback(() => {
    const minStartingCode = minify(currentItem.start);
    const minEndingCode = minify(currentItem.end);
    const minEditorCode = minify(code);

    if (status === "SOLUTION") {
      if (minEditorCode !== minEndingCode) {
        setCode(currentItem.end, { format: "monaco" });
      }
      return;
    }

    sandbox.getRunnableJS().then(js => {
      const minCompiledJS = minify(js);
      const errorsList: Error[] = [];

      // Might be better to eventually utilize an AST. This method just checks
      // for a match on the type name anywhere in the code, which can create limitations.
      (currentItem.exclude || []).forEach(excludedType => {
        if (minEditorCode.includes(excludedType)) {
          errorsList.push({
            type: "type",
            value: excludedType
          });
        }
      });

      // should be a compiled version of the ending code?
      // (minCompiledJS !== window.ts.transpile(currentItem.end))
      if (minCompiledJS !== minStartingCode) {
        errorsList.push({
          type: "source",
          value: "You can't change the source code."
        });
      }

      setErrors(errorsList);

      if (errorsList.length || markers.length) {
        setStatus("ERROR");
        return;
      }

      if ([minStartingCode, "start"].includes(minEditorCode)) {
        // The challenge is untouched. Return to prevent a false positive.
        return;
      }

      const everythingLooksGood =
        !markers.length && !errorsList.length && status !== "NEW";

      if (everythingLooksGood) {
        // Almost...This timeout is a kind of hacky way to give the compiler time to catch up
        // to prevent false positives for those fast 10X devs.
        let timeout: ReturnType<typeof setTimeout> | null = null;

        const timeoutCallback = () => {
          setStatus("ANSWERED");
        };

        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(timeoutCallback, 500);
      }
    });
  }, [
    code,
    currentItem.end,
    currentItem.exclude,
    currentItem.start,
    markers,
    sandbox,
    setCode,
    status
  ]);

  useEffect(() => {
    handleCheck();
  }, [code, handleCheck, status]);

  function showSolution() {
    setStatus("SOLUTION");
  }

  function handleGoToNextQuestion() {
    // if (status === "ANSWERED") {
    //   setCorrectCount(c => c + 1);
    // }
    setStatus("NEW");
    setShowHint(false);
    onNext();
  }

  function handleReset() {
    setStatus("NEW");
    setCode(currentItem.start, { format: "monaco" });
    setShowHint(false);
  }

  const isAnsweredOrSolution = ["SOLUTION", "ANSWERED"].includes(status);
  const isLastOne = currentIndex + 1 === data.length;
  const showNextButton = isAnsweredOrSolution && !isLastOne && !markers.length;
  const showDoneButton = isAnsweredOrSolution && isLastOne && !markers.length;
  const title = currentItem.title || `Challenge #${currentIndex + 1}`;
  const challengeItemNumber = `Challenge ${currentIndex + 1} of ${data.length}`;

  const renderProhibitedTypes = (currentItem.exclude || []).map(
    (typeName: string) => {
      return <Badge key={typeName}>{typeName}</Badge>;
    }
  );

  return (
    <Layout>
      <Badge>{challengeItemNumber}</Badge>
      <Title>{title}</Title>

      <p>{currentItem.description}</p>
      {!!renderProhibitedTypes.length && (
        <p>Prohibited Types: {renderProhibitedTypes}</p>
      )}

      <div className={buttonGroupStyle}>
        <Button onClick={handleReset} style={{ margin: "3px", flex: 1 }}>
          Reset
        </Button>
        <Button onClick={showSolution} style={{ margin: "3px", flex: 1 }}>
          Show Solution
        </Button>
        <Show when={!!currentItem.hint}>
          <Button
            onClick={() => setShowHint(v => !v)}
            style={{ margin: "3px", flex: 1 }}
          >
            {showHint ? "Hide" : "Show"} Hint
          </Button>
        </Show>
      </div>

      <div style={{ minHeight: "40px" }}>
        <Show when={showHint}>
          <Hint>Hint: {currentItem.hint}</Hint>
        </Show>
      </div>

      <Show when={status === "ANSWERED"}>
        <Celebrate />
      </Show>

      <ErrorsList errors={errors} markers={markers} />

      <div>
        <Show when={showNextButton}>
          <Button size="lg" onClick={handleGoToNextQuestion}>
            Next
          </Button>
        </Show>
        <Show when={showDoneButton}>
          <Button size="lg" onClick={onDone}>
            Done
          </Button>
        </Show>
      </div>
    </Layout>
  );
};

const buttonGroupStyle = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
`;

export const ChallengePage = React.memo(ChallengePageComponent);
