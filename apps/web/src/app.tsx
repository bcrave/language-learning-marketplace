import type { ApolloClient } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { StudentWorkspaceScreen } from "./student-workspace.js";

export function App({ client }: { client: ApolloClient }) {
  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <Routes>
          <Route path="/student" element={<StudentWorkspaceScreen />} />
          <Route path="*" element={<Navigate replace to="/student" />} />
        </Routes>
      </BrowserRouter>
    </ApolloProvider>
  );
}
