import { Box, Typography, LinearProgress } from "@mui/material";

export function ProgressBar({ current, total, label = "Attribué" }) {
  const pourcentage = Number(total) > 0 ? (current / Number(total)) * 100 : 0;
  const reste = Number(total) - current;

  const getColor = () => {
    if (reste === 0) return "success";
    if (reste < 0) return "error";
    return "primary";
  };

  const getMessage = () => {
    if (reste === 0) return { text: "Toute la quantité a été attribuée.", color: "success.main" };
    if (reste < 0) return { text: "La somme dépasse la quantité totale.", color: "error.main" };
    return null;
  };

  const message = getMessage();

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="body2" fontWeight={600}>
          Quantité totale :{" "}
          <Typography component="span" variant="body2" fontFamily="monospace" fontWeight={700} color="primary.main">
            {total}
          </Typography>
        </Typography>
        <Typography variant="body2">
          <Typography
            component="span"
            variant="body2"
            fontFamily="monospace"
            fontWeight={700}
            sx={{ color: getColor() + ".main" }}
          >
            {current}
          </Typography>
          <Typography component="span" variant="body2" color="text.secondary">
            {" "}
            / {total} {label}s
          </Typography>
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(pourcentage, 100)}
        color={getColor()}
        sx={{ height: 8, borderRadius: 1 }}
      />
      {message && (
        <Typography variant="caption" color={message.color} sx={{ mt: 0.5, display: "block", fontWeight: 600 }}>
          {message.text}
        </Typography>
      )}
    </Box>
  );
}