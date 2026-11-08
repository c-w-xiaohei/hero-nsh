import { host, mount, Text } from "nsh";
import { scenarios } from "../scenarios";

function App() {
  const name = String(host.params.scenario ?? "");
  const Scenario = scenarios[name];
  if (!Scenario) return <Text>{`unknown scenario: ${name}`}</Text>;
  return <Scenario />;
}

mount(App);
