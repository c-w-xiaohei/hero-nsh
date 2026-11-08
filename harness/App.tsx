import { host, mount, Text } from "nsh";
import { scenarios } from "../scenarios";
import "./fonts/Inter-Regular.woff2";
import "./fonts/Inter-Medium.woff2";
import "./fonts/Inter-SemiBold.woff2";
import "./fonts/Inter-Bold.woff2";

function App() {
  const name = String(host.params.scenario ?? "");
  const Scenario = scenarios[name];
  if (!Scenario) return <Text>{`unknown scenario: ${name}`}</Text>;
  return <Scenario />;
}

mount(App);
