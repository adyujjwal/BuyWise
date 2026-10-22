import { useEffect, useState } from 'react';
import { Box, Typography, Button, Slider, ToggleButton, ToggleButtonGroup, MenuItem, TextField, Skeleton, Snackbar, Alert } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Save } from 'lucide-react';
import type { UserPreferences, Priority, Currency } from '@buywise/shared';
import { api } from '@/lib/api';
import { palette, radius } from '@/theme/tokens';
import { PageHeader } from '@/app/components/PageHeader';
import { ErrorState } from '@/components/States';

type Level = 'low' | 'medium' | 'high';

interface FormShape {
  defaultCurrency: Currency;
  brandAffinity: Level;
  budgetSensitivity: Level;
  performance: number;
  value: number;
  battery: number;
  portability: number;
  reviews: number;
}

const PRIORITY_FIELDS: Array<{ key: keyof FormShape; dimension: string; label: string; help: string }> = [
  { key: 'performance', dimension: 'performance', label: 'Performance', help: 'Raw speed for demanding tasks' },
  { key: 'value', dimension: 'value', label: 'Value', help: 'Getting the most for the money' },
  { key: 'battery', dimension: 'battery', label: 'Battery life', help: 'Lasting away from a charger' },
  { key: 'portability', dimension: 'portability', label: 'Portability', help: 'Light and easy to carry' },
  { key: 'reviews', dimension: 'reviews', label: 'Reliability', help: 'Proven, well-reviewed products' },
];

function toForm(prefs: UserPreferences): FormShape {
  const imp = new Map(prefs.priorities.map((p) => [p.dimension, p.importance]));
  return {
    defaultCurrency: prefs.defaultCurrency,
    brandAffinity: prefs.brandAffinity,
    budgetSensitivity: prefs.budgetSensitivity,
    performance: imp.get('performance') ?? 0.5,
    value: imp.get('value') ?? 0.5,
    battery: imp.get('battery') ?? 0.5,
    portability: imp.get('portability') ?? 0.5,
    reviews: imp.get('reviews') ?? 0.5,
  };
}

function toPrefs(form: FormShape): UserPreferences {
  const priorities: Priority[] = PRIORITY_FIELDS.map((f) => ({
    dimension: f.dimension,
    importance: form[f.key] as number,
  }));
  return {
    defaultCurrency: form.defaultCurrency,
    brandAffinity: form.brandAffinity,
    budgetSensitivity: form.budgetSensitivity,
    priorities,
  };
}

export default function Preferences() {
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['preferences'], queryFn: api.getPreferences });

  const { control, handleSubmit, reset, formState } = useForm<FormShape>({
    defaultValues: {
      defaultCurrency: 'INR',
      brandAffinity: 'low',
      budgetSensitivity: 'medium',
      performance: 0.5,
      value: 0.5,
      battery: 0.5,
      portability: 0.5,
      reviews: 0.5,
    },
  });

  useEffect(() => {
    if (data) reset(toForm(data));
  }, [data, reset]);

  const save = useMutation({
    mutationFn: (form: FormShape) => api.savePreferences(toPrefs(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preferences'] });
      setToast('Preferences saved');
    },
  });

  if (isLoading) return <Skeleton variant="rectangular" height={420} />;
  if (isError) return <ErrorState title="Couldn’t load your preferences" onRetry={() => refetch()} />;

  return (
    <Box sx={{ maxWidth: 720 }}>
      <PageHeader
        title="Preferences"
        subtitle="These gently bias your results. Every research still adapts to what you ask for that time."
      />

      <form onSubmit={handleSubmit((f) => save.mutate(f))}>
        <Section title="What matters to you" description="Your default weighting across common priorities.">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {PRIORITY_FIELDS.map((f) => (
              <Box key={f.key as string}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 560, color: palette.ink }}>
                      {f.label}
                    </Typography>
                    <Typography variant="caption">{f.help}</Typography>
                  </Box>
                </Box>
                <Controller
                  name={f.key}
                  control={control}
                  render={({ field }) => (
                    <Slider
                      {...field}
                      value={field.value as number}
                      min={0}
                      max={1}
                      step={0.05}
                      onChange={(_, v) => field.onChange(v)}
                      sx={{ color: palette.brand }}
                      aria-label={f.label}
                    />
                  )}
                />
              </Box>
            ))}
          </Box>
        </Section>

        <Section title="Shopping style" description="How brand-loyal and price-sensitive you tend to be.">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <LevelField control={control} name="brandAffinity" label="Brand loyalty" />
            <LevelField control={control} name="budgetSensitivity" label="Budget sensitivity" />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 560, mb: 1 }}>
                Default currency
              </Typography>
              <Controller
                name="defaultCurrency"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select size="small" sx={{ width: 160 }}>
                    <MenuItem value="INR">₹ INR</MenuItem>
                    <MenuItem value="USD">$ USD</MenuItem>
                    <MenuItem value="EUR">€ EUR</MenuItem>
                  </TextField>
                )}
              />
            </Box>
          </Box>
        </Section>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
          <Button type="submit" variant="contained" startIcon={<Save size={16} />} disabled={save.isPending || !formState.isDirty}>
            {save.isPending ? 'Saving…' : 'Save preferences'}
          </Button>
          {formState.isDirty && (
            <Typography variant="caption" sx={{ color: palette.inkTertiary }}>
              Unsaved changes
            </Typography>
          )}
        </Box>
      </form>

      <Box sx={{ mt: 4, p: 2.5, borderRadius: radius.md, background: palette.brandSoft, display: 'flex', gap: 1.5 }}>
        <ShieldCheck size={20} color={palette.brandPressed} style={{ flexShrink: 0, marginTop: 2 }} />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 560, color: palette.brandPressed }}>
            This is everything we store about your preferences.
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: palette.ink }}>
            Five priority weights, two style settings and a currency. No tracking, no inferred profiles, no surprises.
            Clear it any time by resetting the sliders to neutral.
          </Typography>
        </Box>
      </Box>

      <Snackbar open={!!toast} autoHideDuration={2200} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: radius.md }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: radius.lg, background: palette.surface, border: `1px solid ${palette.hairline}`, mb: 2.5 }}>
      <Typography variant="h4">{title}</Typography>
      {description && (
        <Typography variant="body2" sx={{ mt: 0.5, mb: 2.5 }}>
          {description}
        </Typography>
      )}
      {children}
    </Box>
  );
}

function LevelField({ control, name, label }: { control: ReturnType<typeof useForm<FormShape>>['control']; name: 'brandAffinity' | 'budgetSensitivity'; label: string }) {
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 560, mb: 1 }}>
        {label}
      </Typography>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <ToggleButtonGroup
            exclusive
            value={field.value}
            onChange={(_, v) => v && field.onChange(v)}
            size="small"
            sx={{ '& .MuiToggleButton-root': { px: 2.5, textTransform: 'capitalize', '&.Mui-selected': { background: palette.brandSoft, color: palette.brandPressed, borderColor: palette.brandSoftBorder } } }}
          >
            <ToggleButton value="low">Low</ToggleButton>
            <ToggleButton value="medium">Medium</ToggleButton>
            <ToggleButton value="high">High</ToggleButton>
          </ToggleButtonGroup>
        )}
      />
    </Box>
  );
}
