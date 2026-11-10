import { mount, Text, View } from "nsh";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Description,
  ErrorMessage,
  FieldError,
  Form,
  Input,
  InputOTP,
  Label,
  Link,
  Separator,
  Spinner,
  TextField,
} from "hero-nsh";

function SignIn() {
  return (
    <Card className="w-[360px]">
      <Card.Header>
        <Card.Title>Sign in</Card.Title>
        <Card.Description>Welcome back to Acme.</Card.Description>
      </Card.Header>
      <View class="gap-4">
        <Form aria-label="Sign in" onSubmit={(event) => event.preventDefault()}>
          <ErrorMessage>That email and password do not match.</ErrorMessage>
          <TextField isRequired name="email" type="email">
            <Label>Email</Label>
            <Input placeholder="you@acme.com" />
            <FieldError />
          </TextField>
          <TextField isRequired name="password" type="password">
            <Label>Password</Label>
            <Input placeholder="••••••••" />
            <FieldError />
          </TextField>
          <View class="flex-row items-center justify-between gap-4">
            <Checkbox name="remember" defaultSelected>
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Remember me
              </Checkbox.Content>
            </Checkbox>
            <Link href="https://example.com/reset">Forgot password?</Link>
          </View>
          <Button type="submit">Sign in</Button>
        </Form>
      </View>
      <Card.Footer className="gap-1.5">
        <Text class="text-sm text-muted">No account?</Text>
        <Link href="https://example.com/signup">Create one</Link>
      </Card.Footer>
    </Card>
  );
}

function TwoFactor() {
  return (
    <Card className="w-[360px]">
      <Card.Header>
        <Card.Title>Two-factor authentication</Card.Title>
        <Card.Description>Enter the six-digit code from your authenticator app.</Card.Description>
      </Card.Header>
      <View>
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Code expires in 30 seconds</Alert.Title>
          </Alert.Content>
        </Alert>
        <InputOTP maxLength={6}>
          <InputOTP.Group>
            <InputOTP.Slot index={0} />
            <InputOTP.Slot index={1} />
            <InputOTP.Slot index={2} />
          </InputOTP.Group>
          <InputOTP.Separator />
          <InputOTP.Group>
            <InputOTP.Slot index={3} />
            <InputOTP.Slot index={4} />
            <InputOTP.Slot index={5} />
          </InputOTP.Group>
        </InputOTP>
        <View class="flex-row items-center gap-3">
          <Button>Verify</Button>
          <Link href="https://example.com/resend">Resend code</Link>
        </View>
        <Separator />
        <View class="flex-row items-center gap-2">
          <Spinner />
          <Description>Sending a new code to j•••@acme.com</Description>
        </View>
      </View>
    </Card>
  );
}

function App() {
  return (
    <View class="flex-1 items-center justify-center bg-background-secondary p-8">
      <View class="flex-row flex-wrap items-start justify-center gap-6">
        <SignIn />
        <TwoFactor />
      </View>
    </View>
  );
}

mount(App);
