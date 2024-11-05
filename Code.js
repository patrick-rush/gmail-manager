function sendDailySummary() {
  const email =
    PropertiesService.getScriptProperties().getProperty("EMAIL_ADDRESS");
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const summary = createEmailSummary(date);

  GmailApp.sendEmail(email, `Email Summary for ${date}`, summary);
}

function createEmailSummary(date) {
  // Define API key and URL for OpenAI API
  const apiKey =
    PropertiesService.getScriptProperties().getProperty("OPEN_AI_API_KEY");
  const url = "https://api.openai.com/v1/chat/completions";

  // Set headers for the API request
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // Fetch emails from the specified date and compile them into a single text block
  const emailContent = fetchEmailsForDate(date); // Assume this is a helper function that gathers email bodies based on the date
  if (!emailContent) {
    Logger.log("No emails found for the specified date.");
    return "No emails to summarize.";
  }

  // Define prompt content with instructions for summarization and prioritization
  const queryContent = `Summarize and prioritize the following emails from ${date}. Emails should be spit into two categories. High Priority emails should be summarized. Low Priority emails should be listed by subject with no summary:
  ${emailContent}`;

  // Set data for OpenAI request
  const data = {
    model: "gpt-4-0613",
    messages: [
      {
        role: "system",
        content:
          "You are an assistant specialized in summarizing and prioritizing email content for users.",
      },
      {
        role: "user",
        content: queryContent,
      },
    ],
  };

  const options = {
    method: "post",
    headers: headers,
    payload: JSON.stringify(data),
    muteHttpExceptions: true,
  };

  // Make API call to ChatGPT
  try {
    const response = UrlFetchApp.fetch(url, options);
    const jsonResponse = JSON.parse(response.getContentText());

    // Extract summarized text from the API response
    const summary = jsonResponse.choices[0].message.content;
    return summary;
  } catch (error) {
    Logger.log("Error fetching email summary: " + error);
    return "An error occurred while generating the summary.";
  }
}

// Helper function to fetch and format emails for the specified date
function fetchEmailsForDate(date) {
  const dateFormat = "MM/dd/yyyy";
  const formattedDate = Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    dateFormat
  );

  console.log("formattedDate", formattedDate);

  const threads = GmailApp.search(`in:inbox after:${formattedDate}`);
  if (!threads.length) return null;

  const emailContent = threads
    .map((thread) =>
      thread
        .getMessages()
        .map(
          (message) =>
            `From: ${message.getFrom()}\nSubject: ${message.getSubject()}\n\n${message.getPlainBody()}`
        )
        .join("\n---\n")
    )
    .join("\n\n===\n\n");

  return emailContent;
}

// Helper function to get the next day for search range
function getNextDate(date) {
  const currentDate = new Date(date);
  currentDate.setDate(currentDate.getDate() + 1);
  return currentDate.toISOString().split("T")[0];
}
