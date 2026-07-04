/// Maps 1:1 to the `hosts` table in schema_saas_hosting.sql. The row itself
/// is created server-side by the on_auth_user_created trigger, never by
/// the client.
class Host {
  const Host({
    required this.id,
    required this.authUserId,
    required this.fullName,
    required this.email,
    required this.plan,
  });

  final String id;
  final String authUserId;
  final String fullName;
  final String email;
  final String plan;

  factory Host.fromJson(Map<String, dynamic> json) {
    return Host(
      id: json['id'] as String,
      authUserId: json['auth_user_id'] as String,
      fullName: json['full_name'] as String,
      email: json['email'] as String,
      plan: json['plan'] as String? ?? 'free',
    );
  }
}
