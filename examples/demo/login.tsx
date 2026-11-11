import { mount, Text, View } from "nsh";
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  ErrorMessage,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  Separator,
  TextField,
} from "hero-nsh";

function SignIn() {
  return (
    <Card className="w-full p-5">
      <Card.Header className="w-full flex-row items-center justify-center gap-2">
        <Avatar>
          <Avatar.Fallback>A</Avatar.Fallback>
        </Avatar>
        <Card.Title>Sign in to Acme</Card.Title>
      </Card.Header>
      <Card.Content className="w-full gap-3">
        <Text class="text-center text-sm text-muted">Use your work email to continue.</Text>
        <Form aria-label="Sign in" className="gap-3" onSubmit={(event) => event.preventDefault()}>
          <ErrorMessage>That email and password do not match.</ErrorMessage>
          <TextField isRequired name="email" type="email">
            <Label>Email</Label>
            <Input placeholder="you@acme.com" />
            <FieldError />
          </TextField>
          <TextField isRequired name="password" type="password">
            <Label>Password</Label>
            <Input placeholder="Enter your password" />
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
          <Button fullWidth type="submit">Sign in</Button>
        </Form>
        <View class="flex-row items-center gap-2 py-1">
          <Separator className="w-auto flex-1" />
          <Text class="text-xs font-medium text-muted">OR</Text>
          <Separator className="w-auto flex-1" />
        </View>
        <Button fullWidth variant="tertiary">Continue with Google</Button>
        <Button fullWidth variant="tertiary">Continue with Apple</Button>
      </Card.Content>
    </Card>
  );
}

function App() {
  return (
    <View class="flex-1 items-center justify-center bg-background-secondary p-4 sm:p-8">
      <View class="w-full max-w-[380px] gap-5">
        <View class="items-center gap-1">
          <Text class="text-xl font-semibold text-foreground">Acme</Text>
          <Text class="text-sm text-muted">Sign in to your workspace</Text>
        </View>
        <SignIn />
        <Text class="text-center text-sm text-muted">
          No account? <Link href="https://example.com/signup">Create one</Link>
        </Text>
      </View>
    </View>
  );
}

mount(App);
